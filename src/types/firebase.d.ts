declare module '*.json' {
  const value: import('firebase-admin').ServiceAccount;
  export default value;
}
