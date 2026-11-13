# DESKLY design document

Warm desk photography, a restrained dark palette and clear type carry the design. The homepage opens with a single workspace composition. Its assembly and craftsmanship sections explain what to look for in a desk accessory. Form and commerce pages use the same palette with less visual detail so product information and actions are easy to scan.

| Role | Design decision |
| --- | --- |
| Canvas, panel and type | Near black `#10100F`, warm charcoal `#181614` and off-white `#F3EEE8`. |
| Accent and confirmation | Clay `#E89277` marks selected and active controls. Message text also describes success or failure. |
| Typography | Bodoni Moda for editorial headings, Manrope for labels and Inter for body text and controls. |

| Route | Components and layout |
| --- | --- |
| `/` | `Chrome`, `CampaignHero`, `DesignStories`, `Lookbook` and `Footer`. Shop and Setup Builder are available when the store is connected. |
| `/shop`, `/categories/[slug]` | `Catalogue` combines labeled filters, product cards and pagination. |
| `/products/[slug]` | `ProductDetail` combines imagery, variant and quantity controls, pricing and add-to-bag feedback. |
| `/cart`, `/checkout` | `ShoppingBag`, `CheckoutForm`, `CheckoutStatus` and `OrderDetails` separate line items, shipping, payment and confirmation. |
| `/login`, `/register`, `/forgot-password`, `/reset-password` | `AuthForm` renders the required fields and inline validation for each flow. |
| `/setup-builder` | `Builder` pairs budget and preference inputs with results, alternatives and the add-to-bag action. |
| `/account`, `/account/orders`, `/account/settings` | Account sidebar and customer views for orders, profile, addresses, wishlist and saved setups. |
| `/admin`, `/admin/products`, `/admin/inventory`, `/admin/orders` | Admin sidebar, product and variant forms, stock adjustments and fulfillment controls. Tables scroll within their panels. |

Customers follow Home → Shop → Product → Bag → Checkout → Order confirmation. Signed-in customers reopen the order from their account. A separate journey runs from Setup Builder → Preferences → Recommendations → Add setup to bag. Administrators sign in, create and publish a product with a sellable variant, adjust stock and use Orders to process the purchases.

The global header exposes Shop, Our Story and Setup Builder. On mobile it collapses the main links into a menu and retains direct access to the bag and search. The logo returns home. Footer links repeat useful destinations and show contact links when the store operator supplies a public inbox or phone number.

The desktop hero overlays the photograph. On narrow screens the copy moves beneath it, forms and split panels stack, and tables keep their own scroll area. The UI includes descriptive labels, visible focus, a skip link, accessible success and error messages, a custom missing-page screen, and support for reduced motion. See [visual details and media credits](design.md).
