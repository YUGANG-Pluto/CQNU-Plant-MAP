function clearNode(node) {
  if (node) {
    node.replaceChildren();
  }
}

function el(tagName, options = {}, children = []) {
  const node = document.createElement(tagName);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = String(options.text);
  if (options.title !== undefined) node.title = String(options.title);
  if (options.value !== undefined) node.value = String(options.value);
  if (options.dataset) {
    Object.entries(options.dataset).forEach(([key, value]) => {
      node.dataset[key] = String(value);
    });
  }
  children.filter(Boolean).forEach(child => node.appendChild(child));
  return node;
}

function listTextItem(title, meta = '', className = 'list-item') {
  const children = [
    el('div', { className: 'title', text: title })
  ];
  if (meta) {
    children.push(el('div', { className: 'meta', text: meta }));
  }
  return el('div', { className }, children);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    clearNode,
    el,
    listTextItem
  };
}
