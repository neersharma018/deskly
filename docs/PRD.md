# DESKLY product requirements

DESKLY is a single-vendor desk-accessory store for India. Finding individual accessories is easy. Finding an in-stock combination that suits a workspace, works with existing equipment and stays within budget takes more effort. DESKLY brings catalogue discovery, compatible setup recommendations and ordering into one store.

The submission objective is to finish an end-to-end purchase using persisted catalogue and inventory data, let the customer review the order, and let a store operator manage the catalogue and fulfillment. The full product brief and future requirements are in the [original PRD](../prd.md).

| Persona | Need |
| --- | --- |
| Budget-conscious student | Find essentials that fit both a small desk and a strict budget. |
| Developer or remote worker | Build a quiet or wireless setup around existing equipment. |
| Gamer | Find accessories with a suitable aesthetic and current stock. |
| Store operator | Publish accessories, adjust inventory and process orders in one place. |

| MVP capability | User story | Acceptance criteria |
| --- | --- | --- |
| Catalogue and product details | As a shopper, I want to find and compare compatible desk accessories. | Query and category filters return published database records. An item page displays images, price and stock for the selected variant. |
| Cart | As a shopper, I want to change quantities and resume my bag later. | Add, update and remove persist. The backend rejects unavailable quantities and recalculates totals. |
| Checkout | As an evaluator, I want to place an order without a payment account. | Demo checkout saves an order and inventory movements in a local sample database. Confirmation explicitly states that no payment was collected. A retried request returns the same order. |
| Customer identity and ownership | As a customer, I want my orders and settings to remain private. | Register, sign in and sign out work. An unauthenticated visitor is sent to sign in, and customers can open only their own orders. |
| Administration | As an operator, I want inventory changes reflected in the shop. | An administrator can create and edit products, add variants, adjust stock and update fulfillment. The API rejects customer access to admin operations. |
| Setup Builder | As a shopper, I want a setup that matches my budget and style. | Recommendations use current catalogue stock and respect the item budget. The API checks compatibility and price again when adding the setup to the cart. |

The site must fit desktop and narrow mobile screens. Forms need accessible names and visible feedback. Prices use integer paise, and stock updates and order creation use database transactions. Passwords are hashed, and credentials belong in environment configuration. API and browser workflows should run against a disposable sample database before evaluation.

Live fulfillment integrations, a multi-vendor marketplace, enterprise identity and production tax or invoicing automation are outside this MVP. Live online payments, password reset email, hosted explanations and media uploads depend on provider configuration. The public deployment serves the frontend while the local evaluator setup runs the complete stack. Product photos accompanying sample records are illustrative.
