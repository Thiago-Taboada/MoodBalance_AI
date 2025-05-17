import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, setDoc, getDocs, addDoc, updateDoc, Timestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import { firebaseConfig } from "./credentials.js";



const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function loadUserChats() {
    const userEmail = sessionStorage.getItem('email');
    if (!userEmail) {
        console.error("Não achou email no sessionStorage.");
        return;
    }

    const chatsContainer = document.getElementById('chats');
    if (!chatsContainer) {
        console.error("Sem #chats container.");
        return;
    }

    chatsContainer.innerHTML = '';

    try {
        const chatsCollection = collection(db, "users", userEmail, "chats");
        const chatsQuery = query(chatsCollection, orderBy("last_updated", "desc"));
        const chatsSnapshot = await getDocs(chatsQuery);

        if (chatsSnapshot.empty) {
            chatsContainer.textContent = "Nenhum chat encontrado.";
            return;
        }

        chatsSnapshot.forEach(docSnap => {
            const chatData = docSnap.data();
            const chatDiv = document.createElement('div');
            chatDiv.classList.add('chat-item');
            chatDiv.textContent = chatData.title || docSnap.id;
            chatDiv.dataset.chatId = docSnap.id;

            // (Opcional) Lógica para abrir chat
            // chatDiv.addEventListener('click', () => openChat(docSnap.id));

            chatsContainer.appendChild(chatDiv);
        });

    } catch (error) {
        console.error("Erro ao carregar chats:", error);
        chatsContainer.textContent = "Erro ao carregar chats.";
    }
}

async function saveChatMessage(message, systemMessage, chatId) {
    const email = sessionStorage.getItem('email');
    if (!email) {
        console.error("Não achou email no sessionStorage.");
        return;
    }

    const sender = systemMessage ? "system" : "user";

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');

    const randomLetters = Math.random().toString(36).substring(2, 5);
    const messageId = `${yyyy}${mm}${dd}-${hh}${min}${ss}-${sender}-${randomLetters}`;

    try {
        const chatRef = doc(db, "users", email, "chats", chatId);

        const chatSnap = await getDoc(chatRef);
        if (!chatSnap.exists()) {
            throw new Error(`Chat "${chatId}" não encontrado para o usuário.`);
        }

        const nowTimestamp = Timestamp.now();

        const messageRef = doc(collection(chatRef, "messages"), messageId);
        await setDoc(messageRef, {
            text: message,
            sender: sender,
            timestamp: nowTimestamp
        });

        await updateDoc(chatRef, {
            last_updated: nowTimestamp
        });

        console.log(`Mensagem guardada em ${chatId} como ${messageId}`);
    } catch (error) {
        console.error("Erro ao guardar a mensagem:", error.message || error);
    }
}

async function createChat(chatId, originalTitle) { 
    const userEmail = sessionStorage.getItem('email');
    if (!userEmail) throw new Error("Usuário não identificado");

    const chatRef = doc(db, "users", userEmail, "chats", chatId);

    const existing = await getDoc(chatRef);
    if (existing.exists()) {
        throw new Error("Já existe um chat com esse nome.");
    }

    const now = Timestamp.now();

    await setDoc(chatRef, {
        title: originalTitle,
        created_at: now,
        last_updated: now
    });
}

function normalizeChatTitle(title) {
    return title
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/ñ/g, 'n')
        .replace(/ç/g, 'c')
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .toLowerCase();
}

document.getElementById('new-chat').addEventListener('click', async () => {
    const rawTitle = prompt("Nome do chat novo:");
    
    if (!rawTitle || rawTitle.trim() === '') {
        alert("O titulo não pode estar vazio!");
        return;
    }

    const normalizedTitle = normalizeChatTitle(rawTitle);

    try {
        await createChat(normalizedTitle, rawTitle);
        await loadUserChats();
    } catch (error) {
        console.error("Error ao criar o chat:", error);
        alert("Erro criando o chat.", error);
    }
});

document.getElementById('saveMessage').addEventListener('click', () => {
    saveChatMessage("Hola, ¿estás ahí?", false, "maria_paula");
    saveChatMessage("si bb", true, "maria_paula");
    saveChatMessage("ah ok", false, "maria_paula");
});

document.addEventListener('DOMContentLoaded', () => {
    loadUserChats();
});
