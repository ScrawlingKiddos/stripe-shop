// constants & variables
const stripe = Stripe("YOUR_STRIPE_PUBLIC_API_KEY");
const button = document.getElementById("payment-submit");

const params = new URLSearchParams(window.location.search);
const clientSecret = params.get("clientSecret");

const appearance = {
    theme: "stripe",
    labels: "floating",

    variables: {
        colorPrimary: "#C93756",
        colorBackground: "#DB5A6B",

        colorText: "#fff0f3",
        colorDanger: "#fff0f3",

        fontFamily: `"Ubuntu", sans-serif`,
        fontSizeBase: "20px",

        spacingUnit: "5px",
        borderRadius: "10px"
    },
    rules: {
        ".TabLabel": {
            color: "#fff0f3",
        },
        ".AccordionItem--selected": {
            color: "#fff0f3",
        }
    }
};

let items = [{id: "xl-tshirt"}];

// UI functions
const showMessage = (text) => {
    const container = document.getElementById("payment-message");

    container.classList.remove("hidden");
    container.textContent = text;

    setTimeout(() =>{
        messageContainer.classList.add("hidden");
        messageText.textContent = "";
    }, 4000);
}

// stripe-related functions
async function generatePaymentIntent() {
    const response = await fetch("/create-payment-intent", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({items}),
    });
    
    const { clientSecret } = await response.json();
    return clientSecret;
}

// main stuff
const elements = stripe.elements({
    clientSecret: clientSecret, 
    appearance: appearance,

    fonts: [
        {cssSrc: "https://fonts.googleapis.com/css2?family=Ubuntu&display=swap"}
    ],
    locale: "pl"
});

const paymentElement = elements.create("payment", {
    layout: "accordion",
    fields: {
        billingDetails: {
            email: "never"
        }
    }
});

// injecting the payment element
paymentElement.mount("#payment-element");

paymentElement.on("ready", () => {
    paymentElement.focus();
});

paymentElement.on("escape", () => {
    button.click();
});

// form submission
const paymentForm = document.getElementById("payment-form");

paymentForm.onsubmit = async (event) => {
    event.preventDefault();

    button.disabled = true;

    const { error } = await stripe.confirmPayment({
        elements, confirmParams: {
            return_url: window.location.origin,

            payment_method_data: {
                billing_details: {
                    email: "heyn@heyn.live"
                }
            }
        },
    });

    if (error.type === "card_error" || error.type === "validation_error") {
        showMessage(error.message);
    } else {
        showMessage("An unexpected error occurred.");
    }

    button.disabled = false;
}