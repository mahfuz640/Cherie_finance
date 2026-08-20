import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Boxes, Camera, History, Image as ImageIcon, PackagePlus, Pencil, Plus, ShoppingBag, Tag, TrendingUp } from 'lucide-react';
import { API } from '../api';
import Modal from './Modal';

const money = (amount) => `BDT ${Number(amount || 0).toLocaleString('en-BD')}`;
const PEOPLE = { admin: 'Admin', nadiya: 'Nadiya', mahfuz: 'Mahfuz' };
const dateText = (date) => date ? new Date(`${date}T00:00:00`).toLocaleDateString('en-BD', { dateStyle: 'medium' }) : '—';

function localDateTime() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function readImage(file) {
  return new Promise((resolve, reject) => {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return reject(new Error('Use a PNG, JPG, or WebP image.'));
    if (file.size > 2 * 1024 * 1024) return reject(new Error('Image must be smaller than 2 MB.'));
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('The image could not be read.'));
    reader.readAsDataURL(file);
  });
}

export default function ProductCatalog({ session, logout, notify, refreshDashboard }) {
  const [catalog, setCatalog] = useState(null);
  const [image, setImage] = useState('');
  const [selectedSale, setSelectedSale] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const writable = ['admin', 'nadiya', 'mahfuz'].includes(session.user.role);
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` };

  async function load() {
    const response = await fetch(`${API}/catalog`, { headers });
    if (response.status === 401) return logout();
    const result = await response.json();
    if (!response.ok) return notify(result.message || 'Could not load products.');
    setCatalog(result);
  }

  useEffect(() => { load(); }, []);

  async function request(path, body, method = 'POST') {
    const response = await fetch(`${API}${path}`, { method, headers, body: JSON.stringify(body) });
    const result = await response.json();
    if (response.status === 401) { logout(); return false; }
    if (!response.ok) { notify(result.message); return false; }
    notify('Saved successfully');
    await load();
    await refreshDashboard();
    return true;
  }

  async function createCategory(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (await request('/categories', { name: new FormData(form).get('name') })) form.reset();
  }

  async function chooseImage(event) {
    const file = event.target.files[0];
    if (!file) return setImage('');
    try { setImage(await readImage(file)); } catch (error) { event.target.value = ''; setImage(''); notify(error.message); }
  }

  async function createProduct(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const saved = await request('/products', {
      categoryId: values.get('categoryId'), itemName: values.get('itemName'), productName: values.get('productName'),
      quantity: values.get('quantity'), buyPrice: values.get('buyPrice'), image,
      brand: values.get('brand'), supplier: values.get('supplier'), unit: values.get('unit'),
      description: values.get('description'), purchaseDate: values.get('purchaseDate'), expiryDate: values.get('expiryDate'),
      lowStockAlert: values.get('lowStockAlert'),
    });
    if (saved) { form.reset(); setImage(''); }
  }

  async function recordSale(event) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const saved = await request(`/products/${selectedSale.id}/sales`, {
      quantity: values.get('quantity'), sellPrice: values.get('sellPrice'), soldAt: values.get('soldAt'),
    });
    if (saved) setSelectedSale(null);
  }

  async function updateProduct(event) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const saved = await request(`/products/${editingProduct.id}`, {
      categoryId: values.get('categoryId'), itemName: values.get('itemName'), productName: values.get('productName'), image,
      brand: values.get('brand'), supplier: values.get('supplier'), unit: values.get('unit'), description: values.get('description'),
      purchaseDate: values.get('purchaseDate'), expiryDate: values.get('expiryDate'), lowStockAlert: values.get('lowStockAlert'),
    }, 'PATCH');
    if (saved) { setEditingProduct(null); setImage(''); }
  }

  const visibleProducts = useMemo(() => {
    if (!catalog) return [];
    return categoryFilter === 'all' ? catalog.products : catalog.products.filter((product) => String(product.category_id) === categoryFilter);
  }, [catalog, categoryFilter]);

  if (!catalog) return <div className="catalog-loading">Loading product catalog…</div>;

  const stockQuantity = catalog.products.reduce((sum, product) => sum + product.quantity, 0);
  const stockValue = catalog.products.reduce((sum, product) => sum + product.quantity * product.buy_price, 0);
  const salesValue = catalog.products.reduce((sum, product) => sum + product.total_sales, 0);
  const lowStockCount = catalog.products.filter((product) => product.quantity <= product.low_stock_alert).length;
  const grossProfit = catalog.products.reduce((sum, product) => sum + product.total_sales - product.sold_quantity * product.buy_price, 0);

  return (
    <section className="catalog">
      <div className="catalog-summary">
        <article><ShoppingBag /><div><strong>{catalog.products.length}</strong><small>Products</small></div></article>
        <article><Boxes /><div><strong>{stockQuantity}</strong><small>In stock</small></div></article>
        <article><AlertTriangle /><div><strong>{lowStockCount}</strong><small>Low stock</small></div></article>
        <article><PackagePlus /><div><strong>{money(stockValue)}</strong><small>Stock value</small></div></article>
        <article><History /><div><strong>{money(salesValue)}</strong><small>Product sales</small></div></article>
        <article><TrendingUp /><div><strong>{money(grossProfit)}</strong><small>Gross profit</small></div></article>
      </div>

      {writable && (
        <div className="catalog-entry">
          <form className="category-form" onSubmit={createCategory}>
            <div className="form-title"><span className="form-icon"><Tag /></span><div><h2>Create category</h2><p>Group similar products together.</p></div></div>
            <div className="inline-field"><input name="name" maxLength="60" placeholder="e.g. Skincare" required /><button className="primary"><Plus /> Add</button></div>
          </form>

          <form className="product-form" onSubmit={createProduct}>
            <div className="form-title"><span className="form-icon"><PackagePlus /></span><div><h2>Add a product</h2><p>Record new inventory and its purchase cost.</p></div></div>
            {catalog.categories.length ? <>
              <div className="product-fields">
                <label>Category<select name="categoryId" required>{catalog.categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label>
                <div className="auto-code-note"><Tag /><span><b>Product code</b><small>Generated automatically when saved</small></span></div>
                <label>Item name<input name="itemName" maxLength="100" placeholder="Item or model name" required /></label>
                <label>Product name<input name="productName" maxLength="120" placeholder="Product display name" required /></label>
                <label>Brand<input name="brand" maxLength="80" placeholder="Brand name" /></label>
                <label>Supplier<input name="supplier" maxLength="100" placeholder="Supplier or source" /></label>
                <label>Unit<select name="unit" defaultValue="pcs"><option value="pcs">Pieces (pcs)</option><option value="box">Box</option><option value="pack">Pack</option><option value="kg">Kilogram (kg)</option><option value="g">Gram (g)</option><option value="litre">Litre</option><option value="ml">Millilitre (ml)</option></select></label>
                <label>Quantity<input name="quantity" type="number" min="1" step="1" required /></label>
                <label>Buy price per item (BDT)<input name="buyPrice" type="number" min="0" step="0.01" required /></label>
                <label>Low-stock alert at<input name="lowStockAlert" type="number" min="0" step="1" defaultValue="5" required /></label>
                <label>Purchase date<input name="purchaseDate" type="date" /></label>
                <label>Expiry date<input name="expiryDate" type="date" /></label>
                <label className="full-field">Product notes<textarea name="description" maxLength="500" placeholder="Size, color, batch or other useful information" /></label>
              </div>
              <label className="image-upload">
                {image ? <img src={image} alt="Product preview" /> : <span><Camera /><b>Upload product image</b><small>PNG, JPG or WebP · Max 2 MB</small></span>}
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={chooseImage} />
              </label>
              <button className="primary"><PackagePlus /> Save product</button>
            </> : <div className="category-first">Create a category first, then add your product.</div>}
          </form>
        </div>
      )}

      <div className="catalog-toolbar">
        <div><h2>Product inventory</h2><p>Current quantity, cost and sales at a glance.</p></div>
        <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
          <option value="all">All categories</option>
          {catalog.categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}
        </select>
      </div>

      <div className="product-grid">
        {visibleProducts.length ? visibleProducts.map((product) => (
          <article className="product-card" key={product.id}>
            <div className="product-image">{product.image ? <img src={product.image} alt={product.product_name} /> : <ImageIcon />}
              <span className="category-badge">{product.category_name}</span>
              {product.quantity <= product.low_stock_alert && <span className="low-stock-badge"><AlertTriangle /> Low stock</span>}
            </div>
            <div className="product-body">
              <small className="item-name">{product.item_name}{product.brand ? ` · ${product.brand}` : ''}</small><h3>{product.product_name}</h3>
              <div className="product-identifiers">
                {product.sku && <span><small>Product code</small><b>{product.sku}</b></span>}
                {product.supplier && <span><small>Supplier</small><b>{product.supplier}</b></span>}
              </div>
              {product.description && <p className="product-description">{product.description}</p>}
              <div className="product-numbers">
                <span><small>Available</small><strong>{product.quantity} {product.unit || 'pcs'}</strong></span>
                <span><small>Buy price</small><strong>{money(product.buy_price)}</strong></span>
                <span><small>Stock value</small><strong>{money(product.quantity * product.buy_price)}</strong></span>
                <span><small>Sold</small><strong>{product.sold_quantity} {product.unit || 'pcs'}</strong></span>
                <span><small>Sales</small><strong>{money(product.total_sales)}</strong></span>
                <span><small>Gross profit</small><strong>{money(product.total_sales - product.sold_quantity * product.buy_price)}</strong></span>
              </div>
              <div className="product-dates"><span>Purchased <b>{dateText(product.purchase_date)}</b></span><span>Expires <b>{dateText(product.expiry_date)}</b></span></div>
              {writable && <div className="product-actions">
                {session.user.role === 'admin' && <button type="button" className="edit-product" onClick={() => { setEditingProduct(product); setImage(product.image || ''); }}><Pencil size={16} /> Edit product</button>}
                <button className="sell-button" disabled={!product.quantity} onClick={() => setSelectedSale(product)}>{product.quantity ? 'Record a sale' : 'Out of stock'}</button>
              </div>}
            </div>
          </article>
        )) : <div className="empty-products"><ShoppingBag /><h3>No products found</h3><p>Add a category and your first product to get started.</p></div>}
      </div>

      <div className="sales-history">
        <div><h2>Recent product sales</h2><p>Sell quantity, price and selling time.</p></div>
        <div className="table-wrap"><table><thead><tr><th>Product</th><th>Quantity</th><th>Sell price</th><th>Buy cost</th><th>Gross profit</th><th>Recorded by</th><th>Sold at</th></tr></thead>
          <tbody>{catalog.sales.length ? catalog.sales.map((sale) => <tr key={sale.id}><td data-label="Product"><b>{sale.product_name}</b><small className="table-subtitle">{sale.category_name} · {sale.item_name}</small></td><td data-label="Quantity">{sale.quantity} {sale.unit || 'pcs'}</td><td data-label="Sell price">{money(sale.sell_price)}</td><td data-label="Buy cost">{money(sale.buy_price)}</td><td data-label="Gross profit" className="profit-cell">{money(sale.quantity * (sale.sell_price - sale.buy_price))}</td><td data-label="Recorded by">{PEOPLE[sale.sold_by] || sale.sold_by}</td><td data-label="Sold at">{new Date(sale.sold_at).toLocaleString('en-BD')}</td></tr>) : <tr><td colSpan="7" className="empty">No product sales yet.</td></tr>}</tbody>
        </table></div>
      </div>

      {selectedSale && <Modal title={`Sell ${selectedSale.product_name}`} onClose={() => setSelectedSale(null)} onSubmit={recordSale}>
        <div className="sale-stock">Available stock: <strong>{selectedSale.quantity}</strong></div>
        <label>Sell quantity<input name="quantity" type="number" min="1" max={selectedSale.quantity} step="1" required /></label>
        <label>Sell price per item (BDT)<input name="sellPrice" type="number" min="0" step="0.01" required /></label>
        <label>Selling date and time<input name="soldAt" type="datetime-local" defaultValue={localDateTime()} required /></label>
      </Modal>}
      {editingProduct && <Modal title={`Edit ${editingProduct.product_name}`} onClose={() => { setEditingProduct(null); setImage(''); }} onSubmit={updateProduct}>
        <label>Category<select name="categoryId" defaultValue={editingProduct.category_id} required>{catalog.categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label>
        <label>Item name<input name="itemName" maxLength="100" defaultValue={editingProduct.item_name} required /></label>
        <label>Product name<input name="productName" maxLength="120" defaultValue={editingProduct.product_name} required /></label>
        <label>Brand<input name="brand" maxLength="80" defaultValue={editingProduct.brand || ''} /></label>
        <label>Supplier<input name="supplier" maxLength="100" defaultValue={editingProduct.supplier || ''} /></label>
        <label>Unit<select name="unit" defaultValue={editingProduct.unit || 'pcs'}><option value="pcs">Pieces (pcs)</option><option value="box">Box</option><option value="pack">Pack</option><option value="kg">Kilogram (kg)</option><option value="g">Gram (g)</option><option value="litre">Litre</option><option value="ml">Millilitre (ml)</option></select></label>
        <label>Low-stock alert at<input name="lowStockAlert" type="number" min="0" step="1" defaultValue={editingProduct.low_stock_alert} required /></label>
        <label>Purchase date<input name="purchaseDate" type="date" defaultValue={editingProduct.purchase_date || ''} /></label>
        <label>Expiry date<input name="expiryDate" type="date" defaultValue={editingProduct.expiry_date || ''} /></label>
        <label>Product notes<textarea name="description" maxLength="500" defaultValue={editingProduct.description || ''} /></label>
        <label className="image-upload">{image ? <img src={image} alt="Product preview" /> : <span><Camera /><b>Upload product image</b><small>PNG, JPG or WebP · Max 2 MB</small></span>}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={chooseImage} /></label>
      </Modal>}
    </section>
  );
}
