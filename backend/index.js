import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { MongoClient, ObjectId } from 'mongodb';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const SECRET = process.env.JWT_SECRET || 'development-only-secret';
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) throw new Error('MONGODB_URI is required.');

app.use(cors());
app.use(express.json({ limit: '4mb' }));

async function connectToMongo() {
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const candidate = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
    try {
      await candidate.connect();
      return candidate;
    } catch (error) {
      await candidate.close().catch(() => {});
      if (attempt === 4) throw error;
      console.warn(`MongoDB connection attempt ${attempt} failed; retrying...`);
      await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
    }
  }
}

const client = await connectToMongo();
const database = client.db(process.env.MONGODB_DB || 'cheries_finance');
const users = database.collection('users');
const investments = database.collection('investments');
const requests = database.collection('requests');
const transactions = database.collection('transactions');
const tasks = database.collection('tasks');
const categories = database.collection('categories');
const products = database.collection('products');
const productSales = database.collection('product_sales');
const counters = database.collection('counters');

await users.createIndex({ role: 1 }, { unique: true });
await categories.createIndex({ name: 1 }, { unique: true });
await users.deleteMany({ role: 'tester' });

async function nextProductCode(session) {
  const counter = await counters.findOneAndUpdate(
    { _id: 'product-code' },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after', session },
  );
  return `CF-${String(counter.seq).padStart(6, '0')}`;
}

const codedProducts = await products.find({ sku: /^CF-\d+$/ }, { projection: { sku: 1 } }).toArray();
const highestProductCode = codedProducts.reduce((highest, product) => Math.max(highest, Number(product.sku.slice(3)) || 0), 0);
await counters.updateOne({ _id: 'product-code' }, { $max: { seq: highestProductCode } }, { upsert: true });
const productsWithoutCodes = await products.find({ $or: [{ sku: { $exists: false } }, { sku: null }, { sku: '' }] }, { projection: { _id: 1 } }).toArray();
for (const product of productsWithoutCodes) {
  await products.updateOne({ _id: product._id }, { $set: { sku: await nextProductCode() } });
}
await products.createIndex({ sku: 1 }, { unique: true });

const seededUsers = [
  ['Administrator', 'admin', 'admin123', 'Administrator'],
  ['Nadiya', 'nadiya', 'nadiya123', 'Director'],
  ['Mahfuz', 'mahfuz', 'mahfuz123', 'Chief Executive Officer'],
];
for (const [name, role, password, designation] of seededUsers) {
  const existing = await users.findOne({ role });
  if (!existing) {
    await users.insertOne({ name, role, password: bcrypt.hashSync(password, 10), designation, responsibilities: '' });
  } else if (!existing.designation) {
    await users.updateOne({ _id: existing._id }, { $set: { designation } });
  }
}

function idFrom(value) {
  return ObjectId.isValid(String(value)) ? new ObjectId(String(value)) : null;
}

function serialize(document) {
  if (!document) return null;
  const result = { ...document, id: document._id.toString() };
  delete result._id;
  if (result.category_id instanceof ObjectId) result.category_id = result.category_id.toString();
  if (result.product_id instanceof ObjectId) result.product_id = result.product_id.toString();
  return result;
}

async function auth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  try {
    const payload = jwt.verify(token, SECRET);
    const id = idFrom(payload.id);
    const user = id && await users.findOne({ _id: id, role: payload.role }, { projection: { password: 0 } });
    if (!user) throw new Error('Inactive account');
    req.user = serialize(user);
    next();
  } catch {
    res.status(401).json({ message: 'Please log in again.' });
  }
}

const canEdit = (req, res, next) => ['admin', 'nadiya', 'mahfuz'].includes(req.user.role)
  ? next()
  : res.status(403).json({ message: 'This account cannot make changes.' });

app.post('/api/login', async (req, res) => {
  const user = await users.findOne({ role: String(req.body.role || '').toLowerCase() });
  if (!user || !bcrypt.compareSync(req.body.password || '', user.password)) return res.status(401).json({ message: 'Incorrect role or password.' });
  const publicUser = serialize(user);
  delete publicUser.password;
  res.json({ token: jwt.sign({ id: publicUser.id, name: user.name, role: user.role }, SECRET, { expiresIn: '12h' }), user: publicUser });
});

app.get('/api/dashboard', auth, async (req, res) => {
  const [investmentRows, requestRows, transactionRows, taskRows, teamRows] = await Promise.all([
    investments.find().sort({ created_at: -1 }).toArray(),
    requests.find().sort({ created_at: -1 }).toArray(),
    transactions.find().sort({ created_at: -1 }).toArray(),
    tasks.find().toArray(),
    users.find({ role: { $in: ['admin', 'nadiya', 'mahfuz'] } }, { projection: { password: 0 } }).toArray(),
  ]);
  const sumRows = (rows, field) => rows.reduce((sum, row) => sum + Number(row[field] || 0), 0);
  const typeRows = (type) => transactionRows.filter((row) => row.type === type);
  const invested = sumRows(investmentRows, 'amount');
  const paid = sumRows(requestRows.filter((row) => row.status === 'approved'), 'amount');
  const selling = sumRows(typeRows('sale'), 'amount');
  const expense = sumRows(typeRows('expense'), 'amount');
  const stockCost = sumRows(typeRows('stock'), 'amount');
  const loan = sumRows(typeRows('loan'), 'amount');
  const loanPaid = sumRows(typeRows('loan_payment'), 'amount');
  const stockIn = sumRows(typeRows('stock'), 'quantity');
  const sold = sumRows(typeRows('sale'), 'quantity');
  taskRows.sort((a, b) => Number(a.status === 'completed') - Number(b.status === 'completed') || String(a.due_date || '9999').localeCompare(String(b.due_date || '9999')));
  const roleOrder = { admin: 1, mahfuz: 2, nadiya: 3 };
  teamRows.sort((a, b) => roleOrder[a.role] - roleOrder[b.role]);
  res.json({
    stats: { invested, paid, remaining: invested - paid, loanRemaining: loan - loanPaid, selling, companyMoney: invested + selling - paid - expense - stockCost - loanPaid, totalQuantity: stockIn, totalSold: sold, totalStock: stockIn - sold, profit: selling - expense - stockCost },
    requests: requestRows.map(serialize),
    investments: investmentRows.map(serialize),
    transactions: transactionRows.map(serialize),
    tasks: taskRows.map(serialize),
    team: teamRows.map(serialize),
  });
});

app.post('/api/investments', auth, canEdit, async (req, res) => {
  const amount = Number(req.body.amount);
  if (!(amount > 0)) return res.status(400).json({ message: 'Enter a valid amount.' });
  const note = String(req.body.note || '').trim();
  if (note.length > 300) return res.status(400).json({ message: 'Investment note cannot exceed 300 characters.' });
  await investments.insertOne({ investor: req.user.name, amount, note, created_by: req.user.role, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  res.status(201).json({ ok: true });
});

function canManageInvestment(investment, user) {
  return user.role === 'admin' || investment.created_by === user.role || investment.investor === user.name;
}

app.patch('/api/investments/:id', auth, canEdit, async (req, res) => {
  const id = idFrom(req.params.id), investment = id && await investments.findOne({ _id: id });
  if (!investment) return res.status(404).json({ message: 'Investment not found.' });
  if (!canManageInvestment(investment, req.user)) return res.status(403).json({ message: 'You can only edit your own investments.' });
  const amount = Number(req.body.amount), note = String(req.body.note || '').trim();
  if (!(amount > 0)) return res.status(400).json({ message: 'Enter a valid amount.' });
  if (note.length > 300) return res.status(400).json({ message: 'Investment note cannot exceed 300 characters.' });
  await investments.updateOne({ _id: id }, { $set: { amount, note, updated_at: new Date().toISOString() } });
  res.json({ ok: true, message: 'Investment updated.' });
});

app.delete('/api/investments/:id', auth, canEdit, async (req, res) => {
  const id = idFrom(req.params.id), investment = id && await investments.findOne({ _id: id });
  if (!investment) return res.status(404).json({ message: 'Investment not found.' });
  if (!canManageInvestment(investment, req.user)) return res.status(403).json({ message: 'You can only delete your own investments.' });
  await investments.deleteOne({ _id: id });
  res.json({ ok: true, message: 'Investment deleted.' });
});

app.post('/api/requests', auth, canEdit, async (req, res) => {
  if (!['nadiya', 'mahfuz'].includes(req.user.role)) return res.status(403).json({ message: 'Only Nadiya or Mahfuz can request money.' });
  const amount = Number(req.body.amount);
  if (!(amount > 0)) return res.status(400).json({ message: 'Enter a valid amount.' });
  await requests.insertOne({ requester: req.user.role, amount, purpose: req.body.purpose || '', status: 'pending', reviewed_by: null, reviewed_at: null, created_at: new Date().toISOString() });
  res.status(201).json({ ok: true });
});

app.patch('/api/requests/:id', auth, canEdit, async (req, res) => {
  const id = idFrom(req.params.id);
  const request = id && await requests.findOne({ _id: id });
  if (!request) return res.status(404).json({ message: 'Request not found.' });
  const allowed = req.user.role === 'admin' || (request.requester === 'nadiya' && req.user.role === 'mahfuz') || (request.requester === 'mahfuz' && req.user.role === 'nadiya');
  if (!allowed) return res.status(403).json({ message: 'This request must be reviewed by the other director.' });
  if (!['approved', 'rejected'].includes(req.body.status)) return res.status(400).json({ message: 'Invalid status.' });
  const result = await requests.updateOne({ _id: id, status: 'pending' }, { $set: { status: req.body.status, reviewed_by: req.user.role, reviewed_at: new Date().toISOString() } });
  if (!result.modifiedCount) return res.status(409).json({ message: 'This request has already been reviewed.' });
  res.json({ ok: true });
});

function canManageRequest(request, user) {
  return user.role === 'admin' || (request.requester === user.role && request.status !== 'approved');
}

app.patch('/api/requests/:id/details', auth, canEdit, async (req, res) => {
  const id = idFrom(req.params.id), request = id && await requests.findOne({ _id: id });
  if (!request) return res.status(404).json({ message: 'Request not found.' });
  if (!canManageRequest(request, req.user)) return res.status(403).json({ message: 'An approved request can only be edited by Admin.' });
  const amount = Number(req.body.amount), purpose = String(req.body.purpose || '').trim();
  if (!(amount > 0)) return res.status(400).json({ message: 'Enter a valid amount.' });
  if (!purpose || purpose.length > 500) return res.status(400).json({ message: 'Purpose must be between 1 and 500 characters.' });
  const changes = { amount, purpose, updated_at: new Date().toISOString() };
  if (req.user.role !== 'admin') Object.assign(changes, { status: 'pending', reviewed_by: null, reviewed_at: null });
  await requests.updateOne({ _id: id }, { $set: changes });
  res.json({ ok: true, message: req.user.role === 'admin' ? 'Request updated.' : 'Request updated and sent for approval.' });
});

app.delete('/api/requests/:id', auth, canEdit, async (req, res) => {
  const id = idFrom(req.params.id), request = id && await requests.findOne({ _id: id });
  if (!request) return res.status(404).json({ message: 'Request not found.' });
  if (!canManageRequest(request, req.user)) return res.status(403).json({ message: 'An approved request can only be deleted by Admin.' });
  await requests.deleteOne({ _id: id });
  res.json({ ok: true, message: 'Request deleted.' });
});

app.post('/api/transactions', auth, canEdit, async (req, res) => {
  const amount = Number(req.body.amount), quantity = Number(req.body.quantity || 0);
  if (!['sale', 'expense', 'loan', 'loan_payment', 'stock'].includes(req.body.type) || amount < 0) return res.status(400).json({ message: 'Invalid transaction.' });
  await transactions.insertOne({ type: req.body.type, amount, quantity, note: req.body.note || '', created_by: req.user.role, created_at: new Date().toISOString() });
  res.status(201).json({ ok: true });
});

app.patch('/api/transactions/:id', auth, canEdit, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Only Admin can edit finance records.' });
  const id = idFrom(req.params.id), amount = Number(req.body.amount), quantity = Number(req.body.quantity || 0), note = String(req.body.note || '').trim();
  if (!id || !Number.isFinite(amount) || amount < 0 || !Number.isInteger(quantity) || quantity < 0 || note.length > 300) return res.status(400).json({ message: 'Enter valid finance record details.' });
  const result = await transactions.updateOne({ _id: id }, { $set: { amount, quantity, note, updated_at: new Date().toISOString() } });
  if (!result.matchedCount) return res.status(404).json({ message: 'Finance record not found.' });
  res.json({ ok: true, message: 'Finance record updated.' });
});

app.delete('/api/transactions/:id', auth, canEdit, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Only Admin can delete finance records.' });
  const id = idFrom(req.params.id), result = id && await transactions.deleteOne({ _id: id });
  if (!result?.deletedCount) return res.status(404).json({ message: 'Finance record not found.' });
  res.json({ ok: true, message: 'Finance record deleted.' });
});

app.get('/api/catalog', auth, async (req, res) => {
  const [categoryRows, productRows, saleRows] = await Promise.all([
    categories.find().sort({ name: 1 }).toArray(), products.find().sort({ product_name: 1 }).toArray(), productSales.find().sort({ sold_at: -1 }).limit(50).toArray(),
  ]);
  const categoryMap = new Map(categoryRows.map((category) => [category._id.toString(), category.name]));
  const salesByProduct = new Map();
  for (const sale of saleRows) {
    const key = sale.product_id.toString();
    if (!salesByProduct.has(key)) salesByProduct.set(key, []);
    salesByProduct.get(key).push(sale);
  }
  const catalogProducts = productRows.map((product) => {
    const sales = salesByProduct.get(product._id.toString()) || [];
    return { ...serialize(product), category_name: categoryMap.get(product.category_id.toString()) || 'Uncategorized', sold_quantity: sum(sales, 'quantity'), total_sales: sales.reduce((total, sale) => total + Number(sale.quantity) * Number(sale.sell_price), 0), last_sold_at: sales[0]?.sold_at || null };
  });
  const productMap = new Map(productRows.map((product) => [product._id.toString(), product]));
  const catalogSales = saleRows.map((sale) => {
    const product = productMap.get(sale.product_id.toString()) || {};
    return { ...serialize(sale), product_name: product.product_name || 'Unknown product', item_name: product.item_name || '', buy_price: product.buy_price || 0, unit: product.unit || 'pcs', category_name: product.category_id ? categoryMap.get(product.category_id.toString()) : 'Uncategorized' };
  });
  res.json({ categories: categoryRows.map(serialize), products: catalogProducts, sales: catalogSales });
});

function sum(rows, field) {
  return rows.reduce((total, row) => total + Number(row[field] || 0), 0);
}

app.post('/api/categories', auth, canEdit, async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name || name.length > 60) return res.status(400).json({ message: 'Category name must be between 1 and 60 characters.' });
  try {
    const result = await categories.insertOne({ name, created_by: req.user.role, created_at: new Date().toISOString() });
    res.status(201).json({ ok: true, id: result.insertedId.toString() });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'This category already exists.' });
    throw error;
  }
});

app.patch('/api/categories/:id', auth, canEdit, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Only Admin can edit categories.' });
  const id = idFrom(req.params.id), name = String(req.body.name || '').trim();
  if (!id || !name || name.length > 60) return res.status(400).json({ message: 'Category name must be between 1 and 60 characters.' });
  try {
    const result = await categories.updateOne({ _id: id }, { $set: { name } });
    if (!result.matchedCount) return res.status(404).json({ message: 'Category not found.' });
    res.json({ ok: true, message: 'Category updated.' });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'This category already exists.' });
    throw error;
  }
});

app.delete('/api/categories/:id', auth, canEdit, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Only Admin can delete categories.' });
  const id = idFrom(req.params.id);
  if (!id) return res.status(404).json({ message: 'Category not found.' });
  if (await products.findOne({ category_id: id })) return res.status(409).json({ message: 'Move or delete products in this category first.' });
  const result = await categories.deleteOne({ _id: id });
  if (!result.deletedCount) return res.status(404).json({ message: 'Category not found.' });
  res.json({ ok: true, message: 'Category deleted.' });
});

app.post('/api/products', auth, canEdit, async (req, res) => {
  const categoryId = idFrom(req.body.categoryId), itemName = String(req.body.itemName || '').trim(), productName = String(req.body.productName || '').trim();
  const quantity = Number(req.body.quantity), buyPrice = Number(req.body.buyPrice), image = String(req.body.image || '');
  const brand = String(req.body.brand || '').trim(), supplier = String(req.body.supplier || '').trim(), unit = String(req.body.unit || 'pcs').trim();
  const description = String(req.body.description || '').trim(), purchaseDate = String(req.body.purchaseDate || ''), expiryDate = String(req.body.expiryDate || ''), lowStockAlert = Number(req.body.lowStockAlert);
  if (!categoryId || !(await categories.findOne({ _id: categoryId }))) return res.status(400).json({ message: 'Choose a valid category.' });
  if (!itemName || !productName || itemName.length > 100 || productName.length > 120) return res.status(400).json({ message: 'Enter valid item and product names.' });
  if (!Number.isInteger(quantity) || quantity < 1 || !Number.isFinite(buyPrice) || buyPrice < 0) return res.status(400).json({ message: 'Enter valid quantity and buy price.' });
  if (brand.length > 80 || supplier.length > 100 || !unit || unit.length > 30 || description.length > 500) return res.status(400).json({ message: 'One or more product details are too long.' });
  if ((purchaseDate && !/^\d{4}-\d{2}-\d{2}$/.test(purchaseDate)) || (expiryDate && !/^\d{4}-\d{2}-\d{2}$/.test(expiryDate))) return res.status(400).json({ message: 'Enter valid purchase and expiry dates.' });
  if (!Number.isInteger(lowStockAlert) || lowStockAlert < 0) return res.status(400).json({ message: 'Enter a valid low-stock alert quantity.' });
  if (image && (!/^data:image\/(png|jpeg|webp);base64,/.test(image) || image.length > 2800000)) return res.status(400).json({ message: 'Upload a PNG, JPG, or WebP image smaller than 2 MB.' });
  const session = client.startSession();
  let productId;
  let productCode;
  try {
    await session.withTransaction(async () => {
      productCode = await nextProductCode(session);
      const result = await products.insertOne({ category_id: categoryId, item_name: itemName, product_name: productName, image: image || null, quantity, buy_price: buyPrice, sku: productCode, brand: brand || null, supplier: supplier || null, unit, description: description || null, purchase_date: purchaseDate || null, expiry_date: expiryDate || null, low_stock_alert: lowStockAlert, created_by: req.user.role, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { session });
      productId = result.insertedId;
      await transactions.insertOne({ type: 'stock', amount: quantity * buyPrice, quantity, note: `Product stock: ${productName}`, created_by: req.user.role, created_at: new Date().toISOString() }, { session });
    });
  } finally { await session.endSession(); }
  res.status(201).json({ ok: true, id: productId.toString(), productCode });
});

app.patch('/api/products/:id', auth, canEdit, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Only Admin can edit products.' });
  const productId = idFrom(req.params.id), categoryId = idFrom(req.body.categoryId);
  const itemName = String(req.body.itemName || '').trim(), productName = String(req.body.productName || '').trim();
  const quantity = Number(req.body.quantity), buyPrice = Number(req.body.buyPrice), image = String(req.body.image || ''), brand = String(req.body.brand || '').trim(), supplier = String(req.body.supplier || '').trim();
  const unit = String(req.body.unit || 'pcs').trim(), description = String(req.body.description || '').trim();
  const purchaseDate = String(req.body.purchaseDate || ''), expiryDate = String(req.body.expiryDate || ''), lowStockAlert = Number(req.body.lowStockAlert);
  if (!productId || !await products.findOne({ _id: productId })) return res.status(404).json({ message: 'Product not found.' });
  if (!categoryId || !await categories.findOne({ _id: categoryId })) return res.status(400).json({ message: 'Choose a valid category.' });
  if (!itemName || !productName || itemName.length > 100 || productName.length > 120) return res.status(400).json({ message: 'Enter valid item and product names.' });
  if (!Number.isInteger(quantity) || quantity < 0 || !Number.isFinite(buyPrice) || buyPrice < 0) return res.status(400).json({ message: 'Enter valid quantity and buy price.' });
  if (brand.length > 80 || supplier.length > 100 || !unit || unit.length > 30 || description.length > 500) return res.status(400).json({ message: 'One or more product details are too long.' });
  if ((purchaseDate && !/^\d{4}-\d{2}-\d{2}$/.test(purchaseDate)) || (expiryDate && !/^\d{4}-\d{2}-\d{2}$/.test(expiryDate))) return res.status(400).json({ message: 'Enter valid purchase and expiry dates.' });
  if (!Number.isInteger(lowStockAlert) || lowStockAlert < 0) return res.status(400).json({ message: 'Enter a valid low-stock alert quantity.' });
  if (image && (!/^data:image\/(png|jpeg|webp);base64,/.test(image) || image.length > 2800000)) return res.status(400).json({ message: 'Upload a PNG, JPG, or WebP image smaller than 2 MB.' });
  const soldQuantity = await productSales.aggregate([{ $match: { product_id: productId } }, { $group: { _id: null, total: { $sum: '$quantity' } } }]).toArray();
  const originalQuantity = quantity + Number(soldQuantity[0]?.total || 0);
  await products.updateOne({ _id: productId }, { $set: { category_id: categoryId, item_name: itemName, product_name: productName, quantity, buy_price: buyPrice, image: image || null, brand: brand || null, supplier: supplier || null, unit, description: description || null, purchase_date: purchaseDate || null, expiry_date: expiryDate || null, low_stock_alert: lowStockAlert, updated_at: new Date().toISOString() } });
  await transactions.updateOne({ type: 'stock', note: { $regex: `^Product stock: ${product.product_name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$` } }, { $set: { amount: originalQuantity * buyPrice, quantity: originalQuantity, note: `Product stock: ${productName}` } });
  res.json({ ok: true, message: 'Product updated.' });
});

app.delete('/api/products/:id', auth, canEdit, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Only Admin can delete products.' });
  const productId = idFrom(req.params.id), product = productId && await products.findOne({ _id: productId });
  if (!product) return res.status(404).json({ message: 'Product not found.' });
  await productSales.deleteMany({ product_id: productId });
  await products.deleteOne({ _id: productId });
  await transactions.deleteMany({ note: `Product stock: ${product.product_name}` });
  res.json({ ok: true, message: 'Product and its sales history deleted.' });
});

app.post('/api/products/:id/sales', auth, canEdit, async (req, res) => {
  const productId = idFrom(req.params.id), quantity = Number(req.body.quantity), sellPrice = Number(req.body.sellPrice), soldAt = String(req.body.soldAt || '');
  if (!productId || !Number.isInteger(quantity) || quantity < 1 || !Number.isFinite(sellPrice) || sellPrice < 0) return res.status(400).json({ message: 'Enter valid sell quantity and price.' });
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(soldAt)) return res.status(400).json({ message: 'Choose a valid selling date and time.' });
  const session = client.startSession();
  try {
    await session.withTransaction(async () => {
      const product = await products.findOne({ _id: productId }, { session });
      if (!product) throw Object.assign(new Error('Product not found.'), { status: 404 });
      if (quantity > Number(product.quantity)) throw Object.assign(new Error(`Only ${product.quantity} item(s) are in stock.`), { status: 400 });
      const updated = await products.updateOne({ _id: productId, quantity: { $gte: quantity } }, { $inc: { quantity: -quantity }, $set: { updated_at: new Date().toISOString() } }, { session });
      if (!updated.modifiedCount) throw Object.assign(new Error('Stock changed. Please try again.'), { status: 409 });
      await productSales.insertOne({ product_id: productId, quantity, sell_price: sellPrice, sold_at: soldAt, sold_by: req.user.role, created_at: new Date().toISOString() }, { session });
      await transactions.insertOne({ type: 'sale', amount: quantity * sellPrice, quantity, note: `Product sale: ${product.product_name}`, created_by: req.user.role, created_at: soldAt }, { session });
    });
    res.status(201).json({ ok: true });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    throw error;
  } finally { await session.endSession(); }
});

app.post('/api/tasks', auth, canEdit, async (req, res) => {
  const title = String(req.body.title || '').trim(), assignedTo = String(req.body.assignedTo || '').toLowerCase();
  const allowedTargets = req.user.role === 'admin' ? ['admin', 'nadiya', 'mahfuz'] : req.user.role === 'nadiya' ? ['nadiya', 'mahfuz'] : req.user.role === 'mahfuz' ? ['mahfuz', 'nadiya'] : [];
  if (!title || title.length > 120) return res.status(400).json({ message: 'Task title must be between 1 and 120 characters.' });
  if (!allowedTargets.includes(assignedTo)) return res.status(403).json({ message: 'You cannot assign a task to this account.' });
  const dueDate = String(req.body.dueDate || ''), dueTime = String(req.body.dueTime || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || !/^\d{2}:\d{2}$/.test(dueTime)) return res.status(400).json({ message: 'Choose a valid planning date and time.' });
  const priority = ['low', 'medium', 'high'].includes(req.body.priority) ? req.body.priority : 'medium';
  await tasks.insertOne({ title, description: String(req.body.planningNote || req.body.description || '').trim(), assigned_by: req.user.role, assigned_to: assignedTo, priority, status: 'todo', due_date: dueDate, due_time: dueTime, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  res.status(201).json({ ok: true });
});

app.patch('/api/tasks/:id', auth, canEdit, async (req, res) => {
  const id = idFrom(req.params.id), task = id && await tasks.findOne({ _id: id });
  if (!task) return res.status(404).json({ message: 'Task not found.' });
  if (req.user.role !== 'admin' && task.assigned_to !== req.user.role) return res.status(403).json({ message: 'Only the assigned person can update this task.' });
  if (req.user.role === 'admin' && req.body.title !== undefined) {
    const title = String(req.body.title || '').trim(), description = String(req.body.planningNote || req.body.description || '').trim();
    const assignedTo = String(req.body.assignedTo || '').toLowerCase(), priority = String(req.body.priority || 'medium');
    const dueDate = String(req.body.dueDate || ''), dueTime = String(req.body.dueTime || '');
    if (!title || title.length > 120 || !['admin', 'nadiya', 'mahfuz'].includes(assignedTo)) return res.status(400).json({ message: 'Enter valid task details.' });
    if (!['low', 'medium', 'high'].includes(priority) || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || !/^\d{2}:\d{2}$/.test(dueTime)) return res.status(400).json({ message: 'Enter valid task schedule and priority.' });
    await tasks.updateOne({ _id: id }, { $set: { title, description, assigned_to: assignedTo, priority, due_date: dueDate, due_time: dueTime, updated_at: new Date().toISOString() } });
    return res.json({ ok: true, message: 'Task updated.' });
  }
  if (!['todo', 'in_progress', 'completed'].includes(req.body.status)) return res.status(400).json({ message: 'Invalid task status.' });
  await tasks.updateOne({ _id: id }, { $set: { status: req.body.status, updated_at: new Date().toISOString() } });
  res.json({ ok: true });
});

app.delete('/api/tasks/:id', auth, canEdit, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Only Admin can delete tasks.' });
  const id = idFrom(req.params.id);
  const result = id && await tasks.deleteOne({ _id: id });
  if (!result?.deletedCount) return res.status(404).json({ message: 'Task not found.' });
  res.json({ ok: true, message: 'Task deleted.' });
});

app.patch('/api/account/password', auth, async (req, res) => {
  const id = idFrom(req.user.id), user = await users.findOne({ _id: id });
  const currentPassword = String(req.body.currentPassword || ''), newPassword = String(req.body.newPassword || '');
  if (!user || !bcrypt.compareSync(currentPassword, user.password)) return res.status(400).json({ message: 'Current password is incorrect.' });
  if (newPassword.length < 8) return res.status(400).json({ message: 'New password must be at least 8 characters.' });
  if (currentPassword === newPassword) return res.status(400).json({ message: 'New password must be different.' });
  await users.updateOne({ _id: id }, { $set: { password: bcrypt.hashSync(newPassword, 10) } });
  res.json({ ok: true, message: 'Password changed successfully.' });
});

app.patch('/api/team/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Only Admin can assign team responsibilities.' });
  const id = idFrom(req.params.id), member = id && await users.findOne({ _id: id, role: { $in: ['nadiya', 'mahfuz'] } });
  if (!member) return res.status(404).json({ message: 'Team member not found.' });
  const allowedDesignations = ['Chief Executive Officer', 'Director', 'Finance Manager', 'Operations Manager', 'Sales Manager', 'Inventory Manager', 'Product Manager', 'Marketing Manager'];
  const designation = String(req.body.designation || ''), responsibilities = String(req.body.responsibilities || '').trim();
  if (!allowedDesignations.includes(designation)) return res.status(400).json({ message: 'Choose a valid designation.' });
  if (responsibilities.length > 800) return res.status(400).json({ message: 'Responsibilities must be 800 characters or less.' });
  await users.updateOne({ _id: id }, { $set: { designation, responsibilities } });
  res.json({ ok: true, message: `${member.name}'s responsibilities were updated.` });
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

const backendDirectory = path.dirname(fileURLToPath(import.meta.url));
const frontendDistDirectory = path.resolve(backendDirectory, '../frontend/dist');
const frontendIndexPath = path.join(frontendDistDirectory, 'index.html');

if (existsSync(frontendIndexPath)) {
  app.use(express.static(frontendDistDirectory));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
    res.sendFile(frontendIndexPath, (error) => {
      if (error) next(error);
    });
  });
} else {
  console.warn('Frontend build not found; starting in API-only mode.');
  app.get('/', (req, res) => res.json({ service: 'Cherie Finance API', status: 'ok', health: '/api/health' }));
}

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ message: 'A server error occurred.' });
});

const port = process.env.PORT || 4000;
const server = app.listen(port, () => console.log(`Finance API connected to MongoDB on http://localhost:${port}`));

const keepAliveMinutes = Number(process.env.KEEP_ALIVE_INTERVAL_MINUTES ?? (process.env.RENDER === 'true' ? 10 : 0));
const renderExternalUrl = String(process.env.RENDER_EXTERNAL_URL || '').trim();
let keepAliveTimer = null;

if (renderExternalUrl && Number.isFinite(keepAliveMinutes) && keepAliveMinutes >= 5) {
  const keepAliveUrl = new URL('/api/health', renderExternalUrl).toString();
  keepAliveTimer = setInterval(async () => {
    try {
      const response = await fetch(keepAliveUrl, {
        headers: { 'User-Agent': 'Cherie-Finance-Keep-Alive/1.0' },
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) console.warn(`Keep-alive health request returned HTTP ${response.status}.`);
    } catch (error) {
      console.warn(`Keep-alive health request failed: ${error.message}`);
    }
  }, keepAliveMinutes * 60 * 1000);
  keepAliveTimer.unref();
  console.log(`Render keep-alive enabled every ${keepAliveMinutes} minutes.`);
}

async function shutdown() {
  if (keepAliveTimer) clearInterval(keepAliveTimer);
  server.close();
  await client.close();
}
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
