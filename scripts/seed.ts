import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI!;

const users = [
  { userId: 'requester01', name: 'Ravi Kumar', designation: 'Store Incharge', phone: '9876543210', email: 'store@naturelite.in', role: 'REQUESTER' },
  { userId: 'pocreator01', name: 'Priya Sharma', designation: 'Purchase Executive', phone: '9876543211', email: 'purchase@naturelite.in', role: 'PO_CREATOR' },
  { userId: 'approver01', name: 'Rajesh Gupta', designation: 'Purchase Head', phone: '9876543212', email: 'head@naturelite.in', role: 'APPROVER' },
  { userId: 'receiver01', name: 'Mohan Singh', designation: 'Gate Incharge', phone: '9876543213', email: 'gate@naturelite.in', role: 'RECEIVER' },
  { userId: 'superadmin', name: 'Admin User', designation: 'System Administrator', phone: '9876543214', email: 'admin@naturelite.in', role: 'SUPERADMIN' },
];

const vendors = [
  { name: 'Agarwal Agro Traders', contactPerson: 'Ramesh Agarwal', phone: '9876512345', email: 'ramesh@agarwalagro.com', address: 'Industrial Area, Jaipur', gstNumber: '08AABCU9603R1ZP' },
  { name: 'Shri Balaji Salt Works', contactPerson: 'Suresh Patel', phone: '9812345678', email: 'info@balajisalt.com', address: 'Salt Lake, Rajkot', gstNumber: '24AABCU1234R1ZK' },
  { name: 'Maheshwari Packaging', contactPerson: 'Dinesh Maheshwari', phone: '9871234567', email: 'sales@maheshwaripack.in', address: 'Sector 5, Ahmedabad', gstNumber: '24AABCU5678R1ZX' },
  { name: 'Krishnam Spices Ltd', contactPerson: 'Amit Krishnam', phone: '9823456789', email: 'sales@krishnamspices.in', address: 'Spice Market, Guntur', gstNumber: '37AABCU9012R1ZQ' },
];

const rawMaterials = [
  { name: 'Groundnut (Raw)', unit: 'KG', category: 'Oil Seeds', minStockAlert: 500 },
  { name: 'Mustard Seeds', unit: 'KG', category: 'Oil Seeds', minStockAlert: 300 },
  { name: 'Sunflower Seeds', unit: 'KG', category: 'Oil Seeds', minStockAlert: 400 },
  { name: 'Rock Salt', unit: 'KG', category: 'Minerals', minStockAlert: 200 },
  { name: 'Sugar', unit: 'KG', category: 'Sweeteners', minStockAlert: 500 },
  { name: 'Packaging Film (BOPP)', unit: 'KG', category: 'Packaging', minStockAlert: 100 },
  { name: 'Cardboard Box (Large)', unit: 'KG', category: 'Packaging', minStockAlert: 200 },
  { name: 'Refined Oil', unit: 'KG', category: 'Oils', minStockAlert: 300 },
  { name: 'Chilli Powder', unit: 'KG', category: 'Spices', minStockAlert: 50 },
  { name: 'Turmeric Powder', unit: 'KG', category: 'Spices', minStockAlert: 50 },
];

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db!;

  await db.collection('users').deleteMany({});
  await db.collection('rawmaterials').deleteMany({});
  await db.collection('counters').deleteMany({});

  const passwordHash = await bcrypt.hash('Test@123', 12);

  for (const user of users) {
    await db.collection('users').insertOne({ ...user, passwordHash, isActive: true, createdAt: new Date(), updatedAt: new Date() });
    console.log(`Created user: ${user.userId}`);
  }

  await db.collection('vendors').deleteMany({});
  for (const vendor of vendors) {
    await db.collection('vendors').insertOne({ ...vendor, materialsSupplied: [], isActive: true, createdAt: new Date(), updatedAt: new Date() });
    console.log(`Created vendor: ${vendor.name}`);
  }

  for (const mat of rawMaterials) {
    await db.collection('rawmaterials').insertOne({ ...mat, isActive: true, addedBy: 'superadmin', createdAt: new Date(), updatedAt: new Date() });
    console.log(`Created material: ${mat.name}`);
  }

  await db.collection('counters').insertOne({ _id: 'poNumber' as any, year: new Date().getFullYear(), seq: 0 });

  console.log('\nSeed complete! Login with any userId and password: Test@123');
  await mongoose.disconnect();
}

seed().catch(console.error);
