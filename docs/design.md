# DESKLY design document

## The After Hours Edit

The storefront takes its cue from Sarkar's full-width film, spare navigation and product-led page rhythm. DESKLY adapts those ideas for a desk equipment collection with near-black surfaces, warm highlights, close-up photographs and concise product copy. Bodoni Moda sets campaign and page headlines. Manrope and Inter keep shopping controls, prices and form labels legible. [Sarkar storefront reference](https://www.sarkar.store/)

| Token | Value | Use |
| --- | --- | --- |
| Canvas | `#10100F` | Page background |
| Ink | `#F3EEE8` | Headings and body text |
| Panel | `#181614` | Forms, product details and selection surfaces |
| Accent | `#E89277` | Active selections, link details and section markers |
| Border | `#433B36` | Panel and card boundaries |

## User journeys

| Journey | Steps | Completion |
| --- | --- | --- |
| Browse the edit | Home → Change scene or open the detail study → Select a numbered product → View product → Add a variant | The bag reflects the persisted item |
| Find an accessory | Shop or category → Apply search and filters → Open result → Select variant | The product page shows the current price and stock |
| Build a setup | Setup Builder or a workspace preset → Enter budget and constraints → Generate → Edit a piece → Save or add the set | The user can reopen the setup or checkout with it |
| Place an order | Bag → Shipping details → Payment method → Order status | Online payment awaits verified capture. Cash on delivery shows payment due |
| Fulfill an order | Admin → Orders → Processing → Shipped → Delivered | Shipment tracking is recorded. Cash collection requires confirmation |

## Components

| Component | Responsibility | Interaction |
| --- | --- | --- |
| `Chrome` | Navigation, search, account and bag | Search and the mobile menu can be dismissed with Escape |
| `CampaignHero` | Hero film, title and three scenes | Numbered buttons crossfade scenes. The muted film can be paused and resumes in view if playback is enabled |
| `Lookbook` | Numbered product study | Each selection changes the photograph, description, current price and product link |
| `Photo`, `ProductCard`, `ProductDetail` | Responsive images, stock, variants and purchase actions | Store-managed photos render directly. Seeded records use representative category photography |
| `Builder` | Preferences, recommendations, alternatives, save and add to bag | Backend validates the edited set against current stock |
| `ShoppingBag`, `CheckoutForm`, `OrderDetails` | Quantities, coupons, shipping, payment choice and order status | Stock changes, quote mismatch and payment states have distinct feedback |

## Responsive behavior and motion

The full-width hero pairs a masked title entrance with a short, silent keyboard film. Scene selection uses a crossfade and a subtle scale transition. Editorial sections lift into view on supported browsers without fading their text. Mobile keeps the film in the background, wraps the scene controls into the bottom rail, and stacks the detail study and purchase flows. Reduced-motion preferences stop the automatic film and disable editorial animation. The Play film control is available for deliberate playback. The still poster remains usable when video playback is unavailable.

## Media credits

The After Hours Edit uses licensed photography and footage. The sample catalogue is identified in the storefront header. Product pages with representative photography also carry an image note. Image and video files are bundled locally in `frontend/public/media/after-hours`. The photo pages below identify the original works. [Unsplash License](https://unsplash.com/license) · [Pexels License](https://www.pexels.com/license/)

| File | Source |
| --- | --- |
| `keystroke.mp4`, `keystroke-poster.webp` | Nothing Ahead. [Moody close-up of backlit keyboard typing](https://www.pexels.com/video/moody-close-up-of-backlit-keyboard-typing-36036749/) |
| `keyboard.webp` | Marcus Richardson. [Black mechanical keyboard on a wooden desk](https://unsplash.com/photos/a-black-mechanical-keyboard-rests-on-a-wooden-desk-qXWO1I4iPMM) |
| `key-detail.webp` | [Mechanical keyboard close-up](https://unsplash.com/photos/close-up-of-a-black-mechanical-keyboard-with-smoke-vsMM0Qgg46s) |
| `mouse.webp` | Pascal M. [Black wireless mouse](https://unsplash.com/photos/black-cordless-computer-mouse-on-black-surface-4PchFKrUw84) |
| `workspace.webp` | Clevenider Petit. [Dark office desk](https://unsplash.com/photos/a-dark-office-desk-with-a-computer-monitor-rtY0WbkRdPk) |
| `focus.webp` | Kevin Canlas. [Dark desk setup](https://unsplash.com/photos/a-computer-desk-with-a-keyboard-mouse-and-monitor-ia7-T2bjDb4) |
| `night.webp` | [Desk with a monitor in a dark room](https://unsplash.com/photos/a-computer-desk-with-a-monitor-and-keyboard-in-a-dark-room-ylKxh_Bw6KM) |
| `walnut.webp` | [Home office with a walnut desk](https://unsplash.com/photos/home-office-workspace-with-wooden-desk-TlRQin0iwjE) |
| `mat.webp` | Oakywood. [Felt desk mat](https://unsplash.com/photos/a-persons-hand-on-a-mouse-pad-next-to-a-keyboard-Zah7GC6mNKg) |
| `lamp.webp` | Beth Stevenson. [Desk lamp on a wooden table](https://unsplash.com/photos/black-desk-lamp-on-brown-wooden-table-okUB5th8QtQ) |
| `stand.webp` | Kevin Charit. [Laptop on a stand](https://unsplash.com/photos/a-laptop-on-a-stand-ub3-qbPvRLc) |
| `cable.webp` | Abdulvahap Demir. [Close-up of a cable](https://www.pexels.com/photo/close-up-of-cable-12671356/) |
| `hub.webp` | [USB-C hub beside a laptop](https://unsplash.com/photos/black-and-silver-laptop-computer-on-brown-wooden-table-QirgO8svCBI) |

[Architecture and contracts](architecture.md)
