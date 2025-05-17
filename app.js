import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, setDoc, getDocs, updateDoc } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import { firebaseConfig } from "./credentials.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

function showLoadingOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'loadingOverlay';
    const spinner = document.createElement('div');
    overlay.appendChild(spinner);
    document.body.appendChild(overlay);
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        document.body.removeChild(overlay);
    }
}

function showMessage(message, divId) {
    const messageDiv = document.getElementById(divId);
    messageDiv.style.display = "block";
    messageDiv.innerHTML = message;
    messageDiv.style.opacity = 1;
    setTimeout(() => {
        messageDiv.style.opacity = 0;
    }, 5000);
}

function validateEmail(email) {
    const regex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    return regex.test(email);
}

function validateUsername(username) {
    return username.length >= 6;
}

function validatePassword(password, confirmPassword) {
    if (password.length < 8) {
        return false;
    }
    return password === confirmPassword;
}

// CADASTRO
const submitSignUpButton = document.getElementById('submitSignUp');
if (submitSignUpButton) {
    submitSignUpButton.addEventListener('click', async (event) => {
        event.preventDefault();

        showLoadingOverlay();

        const usernameInput = document.getElementById('username');
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const confirmPasswordInput = document.getElementById('confirmPassword');

        usernameInput.style.borderColor = '#DAD7CD';
        emailInput.style.borderColor = '#DAD7CD';
        passwordInput.style.borderColor = '#DAD7CD';
        confirmPasswordInput.style.borderColor = '#DAD7CD';

        const username = usernameInput.value;
        const email = emailInput.value;
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        if (!validateEmail(email)) {
            emailInput.style.borderColor = '#e01a4a';
            showMessage('Endereço de e-mail inválido!', 'signUpMessage');
            hideLoadingOverlay();
            return;
        }

        if (!validateUsername(username)) {
            usernameInput.style.borderColor = '#e01a4a';
            showMessage('O nome de usuário deve ter pelo menos 6 caracteres!', 'signUpMessage');
            hideLoadingOverlay();
            return;
        }

        if (!validatePassword(password, confirmPassword)) {
            passwordInput.style.borderColor = '#e01a4a';
            confirmPasswordInput.style.borderColor = '#e01a4a';
            showMessage('Verifique os campos e tente novamente!', 'signUpMessage');
            hideLoadingOverlay();
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await setDoc(doc(db, "users", user.uid), {
                username: username,
                email: email,
                admin: false,
                img: null,
                last_session: null,
                phone: null,
                name: null,
                active: false
            });

            await sendEmailVerification(user);
            showMessage('Conta criada com sucesso! Um e-mail de verificação foi enviado.', 'signUpMessage');

            setTimeout(() => {
                window.location.href = 'login.html';
                hideLoadingOverlay();
            }, 2000);
        } catch (error) {
            hideLoadingOverlay();
            if (error.code === 'auth/email-already-in-use') {
                emailInput.style.borderColor = 'red';
                showMessage('Endereço de e-mail já existe!', 'signUpMessage');
            } else {
                showMessage('Não foi possível criar a conta.', 'signUpMessage');
            }
            console.error(error);
        }
    });
}

// LOGIN
const submitLoginButton = document.getElementById('submitLogin');
if (submitLoginButton) {
    submitLoginButton.addEventListener('click', async (event) => {
        event.preventDefault();

        showLoadingOverlay();
        
        const emailInput = document.getElementById('email');
        const password = document.getElementById('password').value;

        emailInput.style.borderColor = '#DAD7CD';

        const email = emailInput.value;

        if (!validateEmail(email)) {
            emailInput.style.borderColor = '#e01a4a';
            showMessage('Endereço de e-mail inválido!', 'loginMessage');
            hideLoadingOverlay();
            return;
        }

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            if (user.emailVerified) {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                const userData = userDoc.data();

                const today = new Date();
                const dd = String(today.getDate()).padStart(2, '0');
                const mm = String(today.getMonth() + 1).padStart(2, '0');
                const yyyy = today.getFullYear();
                const currentDate = `${dd}/${mm}/${yyyy}`;

                await updateDoc(doc(db, "users", user.uid), {
                    last_session: currentDate,
                    active: true
                });

                sessionStorage.setItem('email', userData.email);
                sessionStorage.setItem('username', userData.username);
                sessionStorage.setItem('img', userData.img);
                sessionStorage.setItem('phone', userData.phone);
                sessionStorage.setItem('name', userData.name);

                if (userData.admin) {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'chat.html';
                }
            } else {
                showMessage('Por favor, verifique seu e-mail antes de fazer login.', 'loginMessage');
            }
            hideLoadingOverlay();
        } catch (error) {
            hideLoadingOverlay();
            if (error.code === 'auth/user-not-found') {
                showMessage('Usuário não encontrado!', 'loginMessage');
            } else if (error.code === 'auth/wrong-password') {
                showMessage('Senha incorreta!', 'loginMessage');
            } else {
                showMessage('Erro ao fazer login.', 'loginMessage');
            }
            console.error(error);
        }
    });
}

// CARREGAR FOTO
document.addEventListener("DOMContentLoaded", () => {
    const userAvatar = document.getElementById("userAvatar");
    const userName = document.getElementById("userName");

    if (userAvatar && userName) {
        const username = sessionStorage.getItem("username") || "Usuário";
        let img = sessionStorage.getItem("img");

        if (!img || img === "null") {
            const randomColor = "#" + Math.floor(Math.random() * 16777215).toString(16);
            userAvatar.style.backgroundColor = randomColor;
            userAvatar.textContent = username.charAt(0).toUpperCase();
        } else {
            userAvatar.style.backgroundImage = `url(${img})`;
            userAvatar.style.backgroundSize = "cover";
        }

        userName.textContent = username;
    }
});

// LOGOUT
const logoutLink = document.getElementById('logoutLink');
if (logoutLink) {
    logoutLink.addEventListener('click', () => {
        sessionStorage.clear();
        localStorage.clear();

        window.location.href = 'login.html';
    });
}

// CARREGA AS INFO DO USER ATUAL
async function loadCurrentUserAndOpenModal() {
    const email = sessionStorage.getItem('email');
    if (!email) {
        console.error("sem email no sessionStorage");
        return;
    }

    try {
        const userDocRef = doc(db, "users", email);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            const user = userDocSnap.data();
            openEditModal(user);
        } else {
            console.error("Usuario nao encontrado no Firestore");
        }
    } catch (error) {
        console.error("Error ao pegar usuario atual:", error);
    }
}

const editLink = document.getElementById('editLink');
if (editLink) {
    editLink.addEventListener('click', (e) => {
        e.preventDefault();
        loadCurrentUserAndOpenModal();
    });
}

// PEGA A LISTA DE USERS
async function loadUserList() {
    let userListContainer = document.querySelector('#user-list');
    const userRows = userListContainer.querySelectorAll('.user-item');
    userRows.forEach(row => row.remove());

    try {
        const querySnapshot = await getDocs(collection(db, "users"));
        
        querySnapshot.forEach((doc) => {
            const user = doc.data();

            const userDiv = document.createElement('div');
            userDiv.classList.add('user-item');
            
            const loginDiv = document.createElement('div');
            loginDiv.classList.add('login-cell');
            const userImg = document.createElement('div');
            userImg.classList.add('user-avatar');
            if (!user.img || user.img === "null") {
                const randomColor = "#" + Math.floor(Math.random() * 16777215).toString(16);
                userImg.style.backgroundColor = randomColor;
                userImg.textContent = user.username.charAt(0).toUpperCase();
            } else {
                userImg.style.backgroundImage = `url(${user.img})`;
                userImg.style.backgroundSize = "cover";
            }

            const userName = document.createElement('p');
            userName.classList.add('user-name');
            userName.textContent = user.username;

            loginDiv.appendChild(userImg);
            loginDiv.appendChild(userName);

            const adminDiv = document.createElement('div');
            adminDiv.classList.add('admin-cell');
            const adminIcon = document.createElement('i');
            adminIcon.classList.add(user.admin ? 'fa-regular' : 'fa-regular', user.admin ? 'fa-square-check' : 'fa-square');
            adminDiv.appendChild(adminIcon);

            const ativoDiv = document.createElement('div');
            ativoDiv.classList.add('ativo-cell');
            const ativoIcon = document.createElement('i');
            ativoIcon.classList.add(user.active ? 'fa-regular' : 'fa-regular', user.active ? 'fa-square-check' : 'fa-square');
            ativoDiv.appendChild(ativoIcon);

            const lastSessionDiv = document.createElement('div');
            lastSessionDiv.classList.add('last-session-cell');
            const lastSession = document.createElement('p');
            lastSession.classList.add('last-session');
            lastSession.textContent = user.last_session ? user.last_session : "Nunca";
            lastSessionDiv.appendChild(lastSession);

            const editDiv = document.createElement('div');
            editDiv.classList.add('edit-cell');
            const editButton = document.createElement('button');
            editButton.classList.add('edit-button');
            editButton.innerHTML = `<i class="fa-solid fa-user-pen"></i>`;
            editButton.addEventListener('click', () => openEditModal(user));
            editDiv.appendChild(editButton);

            userDiv.appendChild(loginDiv);
            userDiv.appendChild(adminDiv);
            userDiv.appendChild(ativoDiv);
            userDiv.appendChild(lastSessionDiv);
            userDiv.appendChild(editDiv);

            userListContainer.appendChild(userDiv);
        });
    } catch (error) {
        console.error("Erro ao carregar usuarios:", error);
    }
}

function formatPhoneNumber(phone) {
    phone = phone.replace(/\D/g, '');
    return phone.replace(/^(\d{2})(\d{1})(\d{4})(\d{4})$/, '($1) $2 $3-$4');
}


function openEditModal(user) {
    document.getElementById('editUserModal').style.display = 'flex';
    const avatar = document.getElementById('editUserAvatar');
    avatar.classList.add('user-avatar');
    
    if (!user.img || user.img === "null") {
        const randomColor = "#" + Math.floor(Math.random() * 16777215).toString(16);
        avatar.style.backgroundColor = randomColor;
        avatar.textContent = user.username.charAt(0).toUpperCase();
    } else {
        avatar.style.backgroundImage = `url(${user.img})`;
        avatar.style.backgroundSize = "cover";
    }
    document.getElementById('editName').value = user.name;
    document.getElementById('editUsername').value = user.username;
    const phoneInput = document.getElementById('editPhone');
    if (phoneInput) {
        phoneInput.value = formatPhoneNumber(user.phone || '');
    }

    document.getElementById('editEmail').value = user.email;
    document.getElementById('editLastSession').value = user.last_session;
    document.getElementById('editAdmin').checked = user.admin;
    document.getElementById('editActive').checked = user.active;
}

const cancelBtn = document.querySelector('.cancel-btn');
if (cancelBtn) {
    cancelBtn.addEventListener('click', closeEditModal);
}
function closeEditModal() {
    document.getElementById('editUserModal').style.display = 'none';
    document.getElementById('editName').value = '';
    document.getElementById('editUsername').value = '';
    document.getElementById('editEmail').value = '';
    document.getElementById('editLastSession').value = '';
    document.getElementById('editAdmin').checked = false;
    document.getElementById('editActive').checked = false;

    const avatar = document.getElementById('editUserAvatar');
    avatar.classList.remove('user-avatar');
    avatar.style.backgroundColor = '';
    avatar.style.backgroundImage = '';
    avatar.textContent = '';
}

document.addEventListener("DOMContentLoaded", () => {
    const userListContainer = document.querySelector('#user-list');
    if (userListContainer) {
        loadUserList();
    }
});


const phoneInput = document.getElementById('editPhone');
if (phoneInput) {
    phoneInput.addEventListener('input', (e) => {
        let cursorPosition = phoneInput.selectionStart;
        let digits = e.target.value.replace(/\D/g, '');
        let formatted = formatPhoneNumber(digits);

        phoneInput.value = formatted;
        phoneInput.setSelectionRange(formatted.length, formatted.length);
    });
}