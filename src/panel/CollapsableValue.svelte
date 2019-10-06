<script>
  import { createEventDispatcher } from 'svelte'
  import Collapse from '../nodes/Collapse.svelte'
  import Editable from './Editable.svelte'

  export let errorMessage
  export let readOnly
  export let value
  export let key

  function stringify(value, k, v) {
    if (Array.isArray(value))
      return `[${value
        .map((value, i) => (i == k ? v : stringify(value)))
        .join(',')}]`
    if (value === null) return 'null'
    if (value === undefined) return 'undefined'

    switch (typeof value) {
      case 'string':
        return `"${value}"`
      case 'number':
        return value.toString()
      case 'object':
        return `{${Object.entries(value)
          .map(([key, value]) => `"${key}":${key == k ? v : stringify(value)}`)
          .join(',')}}`
    }
  }

  const dispatch = createEventDispatcher()

  let collapsed = true

  $: type = typeof value
</script>

<style>
  ul {
    margin-left: 8px;
    width: calc(100% - 8px);
  }

  li {
    position: relative;
    display: flex;
    align-items: end;
    flex-wrap: wrap;
    padding: 4px 0 4px 15px;
  }

  .function,
  .object {
    color: rgb(0, 116, 232);
  }

  li :global(.string) {
    color: rgb(221, 0, 169);
  }

  li :global(.number) {
    color: rgb(5, 139, 0);
  }

  li :global(.null) {
    color: rgb(115, 115, 115);
  }

  li :global(.collapse) {
    margin-left: -15px;
  }

  .error {
    position: absolute;
    top: 0;
    right: 0;
    font-size: 1rem;
  }

  :global(.dark) .function,
  :global(.dark) .object {
    color: rgb(117, 191, 255);
  }

  :global(.dark) li :global(.string) {
    color: rgb(255, 125, 233);
  }
</style>

<li
  {...{ 'data-tooltip': errorMessage }}
  on:click|stopPropagation={e => (collapsed = !collapsed)}>
  {#if type == 'string'}
    {key}:&nbsp;
    <Editable class="string" {readOnly} {value} on:change />
  {:else if value == null || value == undefined || value != value}
    {key}:&nbsp;
    <Editable class="null" {readOnly} {value} on:change />
  {:else if type == 'number' || type == 'boolean'}
    {key}:&nbsp;
    <Editable class="number" {readOnly} {value} on:change />
  {:else if Array.isArray(value)}
    {#if value.length}
      <Collapse class="collapse" {collapsed} />
      {key}:&nbsp;
      <span class="object">Array [{value.length}]</span>
      {#if !collapsed}
        <ul>
          {#each value as v, key}
            <svelte:self
              {readOnly}
              {key}
              value={v}
              on:change={e => dispatch('change', stringify(value, key, e.detail))} />
          {/each}
        </ul>
      {/if}
    {:else}
      {key}:&nbsp;
      <span class="object">Array []</span>
    {/if}
  {:else if type == 'object'}
    {#if value.__isFunction}
      {key}:&nbsp;
      <span class="function" data-tooltip={value.source}>
        function&nbsp;{value.name || ''}&nbsp;()
      </span>
    {:else if Object.keys(value).length}
      <Collapse class="collapse" {collapsed} />
      {key}:&nbsp;
      <span class="object">Object &lbrace;&hellip;&rbrace;</span>
      {#if !collapsed}
        <ul>
          {#each Object.entries(value) as [key, v] (key)}
            <svelte:self
              {readOnly}
              {key}
              value={v}
              on:change={e => dispatch('change', stringify(value, key, e.detail))} />
          {/each}
        </ul>
      {/if}
    {:else}
      {key}:&nbsp;
      <span class="object">Object &lbrace; &rbrace;</span>
    {/if}
  {/if}
  {#if errorMessage}
    <span class="error">!</span>
  {/if}
</li>