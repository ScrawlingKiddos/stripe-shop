let socket;
let products = [];
let ID = null;
function reloadPages() {
    socket.send("getProducts");
    socket.send(`getTemplates ${ID}`);
    renewProductsList()
}
const wsorwss = window.location.origin.toString().substring(0, 5) === "https" ? "wss" : "ws";
window.onload = function() {
    socket = new WebSocket(`${wsorwss}://${window.location.origin.toString().substring(window.location.origin.lastIndexOf('//'))}/wsseller`);
    console.log(socket);
    socket.onopen = function (event) {
        console.log("Opened connection!");
        socket.send("init");
    }
    socket.onmessage = function (event) {
        console.log(event.data);

        switch(event.data.toString().split(" ")[0]) {
            case 'Initialized!':
                ID = event.data.toString().split(" ")[1]
                reloadPages()
                break;
            case "reloadPages":
                reloadPages();
                break;
            case "getProducts":
                let js = JSON.parse(event.data.toString().substring(12));
                products = []
                js.forEach(function(item) {
                    console.log(item);
                    products.push(item);
                });
                renewProductsList();
                break;
            case "getTemplates":
                let templates = JSON.parse(event.data.toString().substring(12));
                console.log(templates)
                let templatesSelect = document.getElementById("templates")
                templatesSelect.innerHTML="";
                let def = document.createElement("option")
                def.text = "New item";
                def.value = JSON.stringify({"name":"Nowy przedmiot","price":0,"quanity":1,"seller":null});
                templatesSelect.appendChild(def);
                templates.forEach(function(item) {
                    let option = document.createElement("option");
                    option.text = item.name;
                    option.value = JSON.stringify(item);
                    templatesSelect.appendChild(option);
                })
                break;
            case "noBuyerWs":
                socket.send("buyerws "+prompt("No buyer connected! Please provide id of the buyer to connect to: "));
                break;
            case "renewPayment":
                let x = confirm("Payment failed. Do you want to retry it?");
                if (x) {
                    socket.send("buy");
                }
                break;
        }
    }
    document.getElementById("add").addEventListener("click", function(e) {
        let templates = document.getElementById("templates")
        let resp = JSON.parse(templates.options[templates.selectedIndex].value)
        products.push(resp);
        console.log(products);
        socket.send("renewProducts "+JSON.stringify(products));
        socket.send("reloadPages");
    });
    document.getElementById("updateBuyer").onclick = function(e) {
        socket.send("renewProducts "+JSON.stringify(products));
        socket.send("reloadPages");
    }
    document.getElementById("pay").onclick = function(e) {
        socket.send("buy");
    }
    document.getElementById("pay_cash").onclick = function(e) {
        let sum = 0
        for (let item of products) {
            sum += item.price*item.quanity;
        }
        let confirm1 = confirm(`Take ${sum/100}zł from the buyer and confirm by clicking yes.`)
        if (confirm1) {
            socket.send("paymentSuccess")
        }
    }

}


function renewProductsList() {
    const table = document.getElementById("current_products")
    table.innerHTML = "<tr><th>Nazwa</th><th>Cena (gr)</th><th>Ilość</th><th>&nbsp;</th></tr>";
    for (let item of products) {
        let index = products.indexOf(item);
        let tr = document.createElement("tr");
        let td1 = document.createElement("td");

        let editable1 = document.createElement("input");
        editable1.type = "text";
        editable1.value = item.name;
        editable1.onchange = function() {
            item.name = editable1.value
            socket.send("renewProducts "+JSON.stringify(products));
            socket.send("reloadPages");
        }
        td1.appendChild(editable1);

        let editable2 = document.createElement("input");
        editable2.type = "number";
        editable2.value = item.price;
        editable2.onchange = function(e) {
            item.price = parseInt(editable2.value)
            socket.send("renewProducts "+JSON.stringify(products));
            socket.send("reloadPages");
        }
        let td2 = document.createElement("td");
        td2.appendChild(editable2);

        let editable3 = document.createElement("input");
        editable3.type = "number";
        editable3.value = item.quanity;
        editable3.onchange = function(e) {
            item.quanity = parseInt(editable3.value)
            socket.send("renewProducts "+JSON.stringify(products));
            socket.send("reloadPages");
        }
        let td3 = document.createElement("td");
        td3.appendChild(editable3);
        tr.appendChild(td1);
        tr.appendChild(td2);
        tr.appendChild(td3);

        let td4 = document.createElement("td");
        let remove = document.createElement("button");
        remove.name = "Remove";
        remove.value = 'Remove';
        remove.innerText='X';
        remove.addEventListener("click", function(e) {
            products = products.filter(function(item1) {return item1 !== item})
            socket.send("renewProducts "+JSON.stringify(products));
            socket.send("reloadPages");
        })
        td4.appendChild(remove);
        tr.appendChild(td4);
        for (let td of tr.children) {
            td.classList.add("product-cell")
        }
        table.appendChild(tr);
    }
}
