import { sequelize } from './config/database';
import { DataTypes } from 'sequelize';

(async () => {
  await sequelize.authenticate();
  const qi = sequelize.getQueryInterface();

  // Check if columns already exist
  const cols = await qi.describeTable('organizations');
  if (!('canPost' in cols)) {
    await qi.addColumn('organizations', 'canPost', { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true });
    console.log('Added canPost column');
  }
  if (!('canMessage' in cols)) {
    await qi.addColumn('organizations', 'canMessage', { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true });
    console.log('Added canMessage column');
  }

  // Also check users.role
  const userCols = await qi.describeTable('users');
  if (!('role' in userCols)) {
    await qi.addColumn('users', 'role', { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'user' });
    console.log('Added role column to users');
  }

  const finalCols = await qi.describeTable('organizations');
  console.log('Org columns:', Object.keys(finalCols).join(', '));
  await sequelize.close();
})();
