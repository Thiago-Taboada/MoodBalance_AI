import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import { firebaseConfig } from "./credentials.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

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
            return;
        }

        if (!validateUsername(username)) {
            usernameInput.style.borderColor = '#e01a4a';
            showMessage('O nome de usuário deve ter pelo menos 6 caracteres!', 'signUpMessage');
            return;
        }

        if (!validatePassword(password, confirmPassword)) {
            passwordInput.style.borderColor = '#e01a4a';
            confirmPasswordInput.style.borderColor = '#e01a4a';
            showMessage('Verifique os campos e tente novamente!', 'signUpMessage');
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await setDoc(doc(db, "users", user.uid), {
                username: username,
                email: email
            });

            await sendEmailVerification(user);
            showMessage('Conta criada com sucesso! Um e-mail de verificação foi enviado.', 'signUpMessage');

            setTimeout(() => window.location.href = 'login.html', 2000);
        } catch (error) {
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

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            if (user.emailVerified) {
                alert("Login bem-sucedido!");
                console.log("Usuario logado:", user);

                window.location.href = 'index.html';
            } else {
                showMessage('Por favor, verifique seu e-mail antes de fazer login.', 'loginMessage');
            }
        } catch (error) {
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
