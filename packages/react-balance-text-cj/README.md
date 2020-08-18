# `react-balance-text-cj`

A fork of [`adobe/balance-text`](https://github.com/adobe/balance-text/) and
[`Khan/react-balance-text`](https://github.com/Khan/react-balance-text/) adding
Chinese and Japanese and custom work segmentation support.

## Features added
- Automatically add line break chances per common line break rules of Chinese and Japanese in all occurrences of Han characters and Kana.
- Allow user to specify their own line break chances by using Zero-Width Spaces (U+200B).
- Allow manual trigger reflow of text by updating a property of the component.
- Support basic formatting for content updated.


## Install

```bash
# Not yet uploaded.
# npm install react-balance-text-cj
```

or

```bash
# Not yet uploaded.
# yarn add react-balance-text-cj
```

## Usage

```tsx
<BalanceText resize>
    人人生而自由，<b>在尊严和权利上一律平等</b>。他们赋有理性和良心，并应以兄弟关系的精神相对待。人人有资格享有本宣言所载的一切权利和自由，不分种族、肤色、性别、语言、宗教、政治或其他见解、国籍或社会出身、财产、出生或其他身分等任何区别。并且不得因一人所属的国家或领土的政治的、行政的或者国际的地位之不同而有所区别，无论该领土是独立领土、托管领土、非自治领土或者处于其他任何主权受限制的情况之下。
</BalanceText>
```

## Properties
- `children`: Children of the component. This will be wrapped by a `<span />` element.  
  > **Attention:** due to the way `balance-text` work, all components passed in as children of the node are converted into plain HTML text (through `ReactDOMServer.renderToStaticMarkup`) before rendering. This means all listeners, hooks or other code logic is lost once rendered. It is recommended to **only render plain text or simple formatting elements** inside `<BalanceText />`.
- `style` (optional): Inline style for the `<span />` wrapper.
- `className` (string, optional): Class names for the `<span />` wrapper.
- `resize` (boolean, default = `false`): Toggles whether to trigger reflow when the viewport resizes.
- `resizeTicket` (any, optional): Set this value to any distinct truthy value to trigger a reflow without changing the content. This could be useful when the style outside this element changes that affects the line size of the content.


## Default line break logic for Chinese and Japanese
By default, if the program sees no Zero-Width Space (ZWS, U+200B) in the text, it will run the default line break logic which roughly replicates how your browser would do for line breaks taking in considerations of common rules rngaegard starting a line and ending a line.

## Custom line break chances for Chinese and Japanese
If you want to specify your own line break chances that may make more sense to you, you can add these marks using ZWS. Once it finds ZWS in the content, it will follow there marks instead of generating its own ones.

Note that spaces and hyphens will continue to act as work break chances in both scenarios. If you want to suppress this behavior, use No Break Space (NBSP, U+00A0) and Non-Breaking Hyphen (U+2011) instead.

```tsx
<BalanceText>
    人人{"\u200B"}生而{"\u200B"}自由，{"\u200B"}在{"\u200B"}尊严{"\u200B"}和{"\u200B"}权利{"\u200B"}上{"\u200B"}一律{"\u200B"}平等。
</BalanceText>
```
