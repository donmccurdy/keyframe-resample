/** WASM loader using an inline Data URI. */
const WASM_BASE64 = '';
const wasm = fetch('data:application/wasm;base64' + WASM_BASE64);
export default wasm;
