// constants
const stripe = Stripe("YOUR_STRIPE_PUBLIC_API_KEY");
const params = new URLSearchParams(window.location.search);
const origin = new URL(window.location.origin);

// helper functions
const sleep = (seconds) => {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

// functions for the page itself
const checkStatus = async () => {
    if (!params.has("payment_intent_client_secret")) {
        return;
    }

    const clientSecret = params.get("payment_intent_client_secret");
    const { paymentIntent } = await stripe.retrievePaymentIntent(clientSecret);

    console.log(paymentIntent.status)
    
    switch (paymentIntent.status) {
        case "succeeded":
            window.history.replaceState({}, document.title, "/");
            socket.send(`paymentSuccess ${paymentIntent.id}`);

            showPopUp("Płatność udana!", "Płatność została zakończona pomyślnie. Dziękujemy za zakupy!");
            
            break;

        case "processing":
            showPopUp("Your payment is processing.", "Please wait for a few seconds.");
            break;
        
        case "requires_payment_method": // bank declined
            socket.send("paymentFailed");
            break;

        case "canceled":
            showPopUp("Your payment was canceled.", "Try to pay again, or just ignore this message.");
            break;

        default:
            showPopUp("Something went wrong.", "Please try again.");
            break;
    }
}

const renewProductsList = (products) => {
    const productList = document.getElementById("products");
    const totalPrice = document.getElementById("total-price-amount");

    let sum = 0;

    while (productList.lastElementChild) {
        productList.removeChild(productList.lastElementChild);
    }

    for (let product of products) {
        const element = document.createElement("div");
        element.classList.add("products-product");

        let price = (product.price / 100) * product.quanity;
        
        sum += price;
        price = price.toLocaleString("pl-PL", {
            minimumFractionDigits: 2 
        });

        element.innerHTML = `
            <div class="products-product-title">${product.name}</div>
            <div class="products-product-price align-right"><b>Cena: </b>${price} zł</div>
            <div class="products-product-amount align-right"><b>Ilość: </b>${product.quanity}</div>
        `;

        productList.appendChild(element);
    }

    totalPrice.innerHTML = sum.toLocaleString("pl-PL", {
        minimumFractionDigits: 2
    }) + " zł";
}

const renewMenuList = (templates) => {
    const menuList = document.getElementById("menu-info");

    while (menuList.lastElementChild) {
        menuList.removeChild(menuList.lastElementChild);
    }

    for (let template of templates) {
        const element = document.createElement("li");
        element.innerHTML = `${template.name} for ${template.price/100} zł`;

        menuList.appendChild(element);
    }
}

const showPopUp = async (title, content) => {
    const popUp = document.getElementById("pop-up");
    const dimElements = document.querySelectorAll("body > *:not(#pop-up)");

    const titleElement = document.getElementById("pop-up-info-title");
    const contentElement = document.getElementById("pop-up-info-content");

    for (let element of dimElements) {
        element.style.animation = "background-dim-in 0.4s forwards";
    }
    
    titleElement.innerText = title;
    contentElement.innerText = content;

    popUp.style.animation = "fade-in 0.7s forwards";
    
    await sleep(1.7);
    
    popUp.style.animation = "fade-out 0.7s forwards";

    for (let element of dimElements) {
        element.style.animation = "background-dim-out 0.4s forwards";
    }
}

const protocol = origin.protocol === "https:" ? "wss" : "ws";
const url = `${protocol}://${origin.hostname}:${origin.port}/wsbuyer`;

const socket = new WebSocket(url);
let products = [];

console.log(socket);
    
socket.onmessage = (event) => {
    switch (event.data.split(" ")[0]) {
        case "ID:":
            console.log(`Connection ID: ${event.data.split(" ")[1]}`);
            socket.send("getProducts");
            socket.send("getTemplates");
            break;
        
        case "getProducts":
            products = JSON.parse(event.data.substring(12));
            renewProductsList(products);

            break;
        
        case "paymentIntent":
            window.location.href = "/checkout.html?clientSecret=" + event.data.substring(14);

            break;

        case "getTemplates":
            const templates = JSON.parse(event.data.substring(13));
            renewMenuList(templates);
            break;
    }
};
checkStatus();