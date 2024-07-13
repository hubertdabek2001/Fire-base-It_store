import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, onSnapshot, addDoc, deleteDoc, doc, query, orderBy, serverTimestamp, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
  measurementId: ""
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth();

// Collection reference
const colRef = collection(db, 'product');
const historyColRef = collection(db, 'history');

// Queries
const q = query(colRef, orderBy('createdAt', 'desc'));

let products = [];
let cart = [];

const registrationForm = document.getElementById('registrationForm');
const loginForm = document.getElementById('loginForm');
const loggedInSection = document.getElementById('loggedInSection');
const userEmailSpan = document.getElementById('userEmail');
const historyDiv = document.getElementById('history');

document.getElementById('registerForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;

  createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      console.log('Rejestracja udana:', userCredential.user);
      alert('Rejestracja udana!');
    })
    .catch((error) => {
      console.error('Błąd rejestracji:', error);
      alert('Błąd rejestracji: ' + error.message);
    });
});

document.getElementById('loginForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      console.log('Logowanie udane:', userCredential.user);
      alert('Logowanie udane!');
    })
    .catch((error) => {
      console.error('Błąd logowania:', error);
      alert('Błąd logowania: ' + error.message);
    });
});

document.getElementById('logoutButton').addEventListener('click', () => {
  signOut(auth).then(() => {
    console.log('Wylogowanie udane');
    alert('Wylogowanie udane!');
  }).catch((error) => {
    console.error('Błąd wylogowania:', error);
    alert('Błąd wylogowania: ' + error.message);
  });
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    registrationForm.classList.add('hidden');
    loginForm.classList.add('hidden');
    loggedInSection.classList.remove('hidden');
    userEmailSpan.textContent = user.email;
    document.getElementById('addNewProduct').classList.remove('hidden');
  } else {
    registrationForm.classList.remove('hidden');
    loginForm.classList.remove('hidden');
    loggedInSection.classList.add('hidden');
    userEmailSpan.textContent = '';
    document.getElementById('addNewProduct').classList.add('hidden');
  }
});

window.toggleDetails = function(id) {
  const details = document.getElementById(id);
  if (details.style.display === "none" || details.style.display === "") {
    details.style.display = "block";
  } else {
    details.style.display = "none";
  }
};

window.addToCart = function(productId, quantity) {
  const product = products.find(p => p.id === productId);
  if (product) {
    const cartItem = cart.find(item => item.id === productId);
    if (cartItem) {
      cartItem.quantity += quantity;
    } else {
      cart.push({ ...product, quantity });
    }
    renderCart();
  }
};

const renderProducts = (products) => {
  const productList = document.getElementById('productList');
  productList.innerHTML = ''; // Clear the list before adding products

  products.forEach(product => {
    const productItem = document.createElement('div');
    productItem.className = 'product';
    const detailsId = `details-${product.id}`;
    productItem.innerHTML = `
      <h2 class="product-title" onclick="toggleDetails('${detailsId}')">${product.name}</h2>
      <div class="product-details" id="${detailsId}">
        <p class="product-description">${product.description}</p>
        <p class="product-price">Cena: ${product.price} PLN</p>
        <p>Kategoria: ${product.category}</p>
        <p>Ilość: ${product.quantity}</p>
        <label for="quantity-${product.id}">Ilość:</label>
        <input type="number" id="quantity-${product.id}" name="quantity" min="1" max="${product.quantity}" value="1">
        <button onclick="addToCart('${product.id}', parseInt(document.getElementById('quantity-${product.id}').value))">Dodaj do koszyka</button>
      </div>
    `;
    productList.appendChild(productItem);
  });
};

const renderCart = () => {
  const cartList = document.getElementById('cart');
  cartList.innerHTML = ''; // Clear the list before adding items

  cart.forEach((item, index) => {
    const cartItem = document.createElement('div');
    cartItem.className = 'cart-item';
    const detailsId = `cart-details-${index}`;
    cartItem.innerHTML = `
      <h2 class="cart-item-title" onclick="toggleDetails('${detailsId}')">${item.name}</h2>
      <div class="cart-item-details" id="${detailsId}">
        <p class="cart-item-description">${item.description}</p>
        <p class="cart-item-price">Cena: ${item.price} PLN</p>
        <p>Kategoria: ${item.category}</p>
        <p>Ilość dostępna: ${item.originalQuantity}</p>
        <label for="cart-quantity-${index}">Ilość:</label>
        <input type="number" id="cart-quantity-${index}" name="quantity" min="1" max="${item.originalQuantity}" value="${item.quantity}">
        <button onclick="purchaseItem(${index}, parseInt(document.getElementById('cart-quantity-${index}').value))">Kup teraz</button>
      </div>
    `;
    cartList.appendChild(cartItem);
  });
};

window.purchaseItem = function(cartIndex, quantity) {
  const cartItem = cart[cartIndex];
  const productRef = doc(db, 'product', cartItem.id);
  const newQuantity = cartItem.originalQuantity - quantity;

  updateDoc(productRef, {
    quantity: newQuantity
  }).then(() => {
    cartItem.quantity -= quantity;
    if (cartItem.quantity <= 0) {
      cart.splice(cartIndex, 1);
    }
    if (newQuantity <= 0) {
      deleteDoc(productRef);
    }
    // Save to history
    addDoc(historyColRef, {
      userId: auth.currentUser.uid,
      productId: cartItem.id,
      quantity: quantity,
      date: serverTimestamp()
    });

    renderCart();
    applyFilters();
  });
};

const applyFilters = () => {
  const category = document.getElementById('categoryFilter').value;
  const price = document.getElementById('priceFilter').value;

  let filteredProducts = products;

  if (category !== 'all') {
    filteredProducts = filteredProducts.filter(product => product.category === category);
  }

  if (price !== 'all') {
    filteredProducts = filteredProducts.filter(product => {
      if (price === 'low') return product.price <= 50;
      if (price === 'medium') return product.price > 50 && product.price <= 100;
      if (price === 'high') return product.price > 100;
    });
  }

  renderProducts(filteredProducts);
};

const renderHistory = (history) => {
  historyDiv.innerHTML = ''; // Clear the list before adding items

  history.forEach(item => {
    const historyItem = document.createElement('div');
    historyItem.className = 'history-item';
    historyItem.innerHTML = `
      <p>Produkt: ${item.productId}</p>
      <p>Ilość: ${item.quantity}</p>
      <p>Data zakupu: ${item.date.toDate().toLocaleString()}</p>
    `;
    historyDiv.appendChild(historyItem);
  });
};

document.getElementById('viewHistory').addEventListener('click', () => {
  const historyQuery = query(historyColRef, orderBy('date', 'desc'));
  onSnapshot(historyQuery, (snapshot) => {
    const history = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    renderHistory(history);
    historyDiv.style.display = 'block';
  });
});

onSnapshot(q, (snapshot) => {
  products = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, originalQuantity: doc.data().quantity }));
  applyFilters();
});

document.getElementById('applyFilters').addEventListener('click', applyFilters);

document.getElementById('viewCart').onclick = () => {
  document.getElementById('productList').style.display = 'none';
  document.getElementById('cart').style.display = 'block';
  document.getElementById('viewCart').style.display = 'none';
  document.getElementById('viewProducts').style.display = 'block';
};

document.getElementById('viewProducts').onclick = () => {
  document.getElementById('productList').style.display = 'block';
  document.getElementById('cart').style.display = 'none';
  document.getElementById('viewCart').style.display = 'block';
  document.getElementById('viewProducts').style.display = 'none';
};

// Adding new document
const addProductForm = document.querySelector('.add');
addProductForm.addEventListener('submit', (e) => {
  e.preventDefault();

  addDoc(colRef, {
    name: addProductForm.name.value,
    description: addProductForm.description.value,
    price: addProductForm.price.value,
    category: addProductForm.category.value,
    quantity: addProductForm.quantity.value,
    createdAt: serverTimestamp()
  }).then(() => {
    addProductForm.reset();
  });
});

// Deleting documents
const deleteProductForm = document.querySelector('.delete');
deleteProductForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const docRef = doc(db, 'product', deleteProductForm.id.value);

  deleteDoc(docRef).then(() => {
    deleteProductForm.reset();
  });
});
