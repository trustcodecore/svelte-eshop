function serializeDOM(node) {
  const obj = {
    nodeType: node.nodeType
  }

  if (node.tagName) obj.tagName = node.tagName.toLowerCase()
  else if (node.nodeName) obj.nodeName = node.nodeName

  if (node.nodeValue) obj.nodeValue = node.nodeValue

  if (node.attributes)
    obj.attributes = Array.from(node.attributes).map(attr => ({
      name: attr.name,
      value: attr.value
    }))

  if (node.childNodes)
    obj.childNodes = Array.from(node.childNodes).map(serializeDOM)

  return obj
}

function serializeComponent(component) {
  return {
    tagName: component.tagName,
    ctx: JSON.parse(JSON.stringify(component.$$.ctx))
  }
}

const port = browser.runtime.connect()
port.postMessage({ type: 'init' })

const nodeMap = new Map()
const ctxMap = new Map()
let _id = 0

document.addEventListener('SvelteInsertEachBlock', e => {
  const node = {
    id: _id++,
    type: 'block',
    properties: {
      tagName: 'each',
      ctx: JSON.parse(JSON.stringify(e.detail.block))
    }
  }
  nodeMap.set(e.detail.block, node)
  ctxMap.set(node.id, e.detail.block)
  let target = nodeMap.get(e.detail.target)
  if (!target || ctxMap.get(target.id) != e.detail.ctx) {
    target = nodeMap.get(e.detail.ctx)
  }

  const anchor = nodeMap.get(e.detail.anchor)
  port.postMessage({
    target: target ? target.id : null,
    anchor: anchor ? anchor.id : null,
    type: 'addNode',
    node
  })
})

document.addEventListener('SvelteInsertHTMLElement', e => {
  const node = {
    id: _id++,
    type:
      e.detail.node.nodeType == 1
        ? 'element'
        : e.detail.node.nodeValue
        ? 'text'
        : 'anchor',
    properties: serializeDOM(e.detail.node)
  }
  nodeMap.set(e.detail.node, node)
  ctxMap.set(node.id, e.detail.ctx)
  let target = nodeMap.get(e.detail.target)
  if (!target || ctxMap.get(target.id) != e.detail.ctx) {
    target = nodeMap.get(e.detail.ctx)
  }

  const anchor = nodeMap.get(e.detail.anchor)
  port.postMessage({
    target: target ? target.id : null,
    anchor: anchor ? anchor.id : null,
    type: 'addNode',
    node
  })
})

document.addEventListener('SvelteInsertComponent', e => {
  const node = {
    id: _id++,
    type: 'component',
    properties: serializeComponent(e.detail.component)
  }
  nodeMap.set(e.detail.component.$$.ctx, node)
  nodeMap.set(node.id, e.detail.component)
  ctxMap.set(node.id, e.detail.component.$$.ctx)
  let target = nodeMap.get(e.detail.target)
  if (!target || ctxMap.get(target.id) != e.detail.ctx) {
    target = nodeMap.get(e.detail.ctx)
  }

  const anchor = nodeMap.get(e.detail.anchor)
  port.postMessage({
    target: target ? target.id : null,
    anchor: anchor ? anchor.id : null,
    type: 'addNode',
    node
  })
})

document.addEventListener('SvelteRemoveNode', e => {
  const node = nodeMap.get(e.detail.node)
  nodeMap.delete(e.detail.node)
  port.postMessage({
    type: 'removeNode',
    node
  })
})

document.addEventListener('SvelteUpdate', e => {
  const node = nodeMap.get(e.detail.ctx)
  node.properties.ctx = JSON.parse(JSON.stringify(e.detail.ctx))
  port.postMessage({
    type: 'updateNode',
    node
  })
})

exportFunction(
  (id, key, value) => {
    const component = nodeMap.get(id).wrappedJSObject
    component.$$.ctx[key] = value
    window.wrappedJSObject.make_dirty(component, key)
  },
  window,
  {
    defineAs: 'setSvelteState'
  }
)
