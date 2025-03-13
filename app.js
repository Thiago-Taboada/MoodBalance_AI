import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import { firebaseConfig } from "./credentials.js";

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Función para mostrar mensajes
function showMessage(message, divId) {
    const messageDiv = document.getElementById(divId);
    messageDiv.style.display = "block";
    messageDiv.innerHTML = message;
    messageDiv.style.opacity = 1;
    setTimeout(() => {
        messageDiv.style.opacity = 0;
    }, 5000);
}

// Validaciones de los campos
function validateEmail(email) {
    const regex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    return regex.test(email);
}

function validateUsername(username) {
    return username.length >= 6;
}

function validatePassword(password, confirmPassword) {
    return password === confirmPassword;
}

// Registro de usuario (sign up)
const submitSignUpButton = document.getElementById('submitSignUp');
if (submitSignUpButton) {
    submitSignUpButton.addEventListener('click', async (event) => {
        event.preventDefault();

        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (!validateEmail(email)) {
            showMessage('Endereço de e-mail inválido!', 'signUpMessage');
            return;
        }

        if (!validateUsername(username)) {
            showMessage('O nome de usuário deve ter pelo menos 6 caracteres!', 'signUpMessage');
            return;
        }

        if (!validatePassword(password, confirmPassword)) {
            showMessage('As senhas não coincidem!', 'signUpMessage');
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Guardar el nombre de usuario en Firestore
            await setDoc(doc(db, "users", user.uid), {
                username: username,
                email: email
            });

            await sendEmailVerification(user);
            showMessage('Conta criada com sucesso! Um e-mail de verificação foi enviado.', 'signUpMessage');

            setTimeout(() => window.location.href = 'login.html', 2000);
        } catch (error) {
            if (error.code === 'auth/email-already-in-use') {
                showMessage('Endereço de e-mail já existe!', 'signUpMessage');
            } else {
                showMessage('Não foi possível criar a conta.', 'signUpMessage');
            }
            console.error(error);
        }
    });
}

// Login de usuario (sign in)
const submitLoginButton = document.getElementById('submitLogin');
if (submitLoginButton) {
    submitLoginButton.addEventListener('click', async (event) => {
        event.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Verificar si el usuario ha verificado su correo electrónico
            if (user.emailVerified) {
                alert("Login bem-sucedido!");
                console.log("Usuario logado:", user);

                // Redirigir al usuario a la página principal (puedes modificar la URL)
                window.location.href = 'index.html'; // Cambia 'home.html' por la página de destino
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
