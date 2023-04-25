# stripe-shop
A simple shop stand with BLIK (or cash) payments, made using Stripe and Express.js. Originally created for a school shop stand, as a way to sell sweets and drinks more efficiently!

Backend made by [heyn](https://github.com/heyngra), frontend made by [bemxio](https://github.com/bemxio).
## Running
Before doing anything, make sure you have Node.js installed. If you don't, you can download it from [here](https://nodejs.org/en/download/). 

You will also need a Stripe account, which you can create [here](https://dashboard.stripe.com/register).

1. Clone the repository, either with `git clone https://github.com/ScrawlingKiddos/stripe-shop`, or by downloading the ZIP file and extracting it.
2. Open the folder in your terminal, and run `npm install` to install all the dependencies.
3. Get your Stripe Public API key, and replace the `YOUR_PUBLIC_STRIPE_API_KEY` with your key within:
    - line 2 in `public/checkout.js`
    - line 2 in `views/buyer.js`
4. Get your Stripe Private API key, and replace the 'YOUR_PRIVATE_STRIPE_API_KEY' with your key within:
    - line 2 in `server.js`
5. Get your key and certificate files in PEM format, named `key.pem` and `cert.pem` accordingly, and save them in the root folder. Then, set the `isHttps` variable at line 9 in `server.js` to `true`. **(optional, only for HTTPS)** 
6. Run `npm start` or `node server.js` to start the server.

The server will be running on port specified in line 12 in `server.js` (4242 by default, 443 if `isHttps` is set to `true`).

## Usage
To set up the shop, enter the buyer site (by default, `http://localhost:4242`) on a device that will work as a stand, and on an another device, enter the seller site (`http://localhost:4242/seller`). 

The seller site will prompt you for a connection ID. To get it, open the developer console on the buyer site, look for "Connection ID:" and copy the 6 letter code. Then, paste it in the seller prompt and click OK.

Items that you add within the seller site should instantly show on the buyer site. If they don't, you can also manually refresh the item list by clicking "Zaaktualizuj widok" on the seller site.
You can also remove items from the seller site and add custom ones. 

For resolving payment, press "Zapłata (BLIK)" or "Zapłata (Gotówka)", depending on the payment method. If "Zapłata (BLIK)" is pressed, the buyer site will redirect to a checkout page, where the customer can enter the BLIK code and pay.

## Contributions
Feel free to open any issues or pull requests about bugs. However, please **do not** request or implement new features.

We are planning to rewrite the whole project using Python & FastAPI in the future, so we don't want to add any new features to this version, mostly keeping it as an archive.
