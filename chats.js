import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getFirestore, collection, doc, getDoc, setDoc, getDocs, addDoc, updateDoc, Timestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import { firebaseConfig } from "./credentials.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function loadUserChats() {
    const userEmail = sessionStorage.getItem('email');
    if (!userEmail) {
        console.error("Não achou email no sessionStorage.");
        return;
    }

    const chatsContainer = document.getElementById('chats');
    const chatTitleP = document.getElementById('chat-title');
    if (!chatsContainer || !chatTitleP) {
        console.error("Elemento chats ou chat-title não encontrado.");
        return;
    }

    chatsContainer.innerHTML = '';

    try {
        const chatsCollection = collection(db, "users", userEmail, "chats");
        const chatsQuery = query(chatsCollection, orderBy("last_updated", "desc"));
        const chatsSnapshot = await getDocs(chatsQuery);

        if (chatsSnapshot.empty) {
            chatsContainer.textContent = "Nenhum chat encontrado.";
            chatTitleP.textContent = "Chat";
            return;
        }

        let activeChat = sessionStorage.getItem('activeChat');
        let activeChatTitle = sessionStorage.getItem('activeChatTitle') || "Chat";

        chatTitleP.textContent = activeChatTitle;

        chatsSnapshot.forEach(docSnap => {
            const chatData = docSnap.data();
            const chatDiv = document.createElement('div');
            chatDiv.classList.add('chat-item');
            chatDiv.textContent = chatData.title || docSnap.id;
            chatDiv.dataset.chatId = docSnap.id;

            if (activeChat === docSnap.id) {
                chatDiv.classList.add('active');
            }

            chatDiv.addEventListener('click', () => {
                activeChat = docSnap.id;
                activeChatTitle = chatData.title || docSnap.id;

                sessionStorage.setItem('activeChat', activeChat);
                sessionStorage.setItem('activeChatTitle', activeChatTitle);

                const allChats = chatsContainer.querySelectorAll('.chat-item');
                allChats.forEach(chat => chat.classList.remove('active'));
                chatDiv.classList.add('active');

                chatTitleP.textContent = activeChatTitle;

                document.getElementById('splash').style.display = 'none';
                document.querySelector('.main-chat').style.display = 'flex';

                console.log("Chat ativo:", activeChat, activeChatTitle);
            });

            chatsContainer.appendChild(chatDiv);
        });

    } catch (error) {
        console.error("Erro ao carregar chats:", error);
        chatsContainer.textContent = "Erro ao carregar chats.";
        document.getElementById('chat-title').textContent = "Chat";
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

async function handleSendMessage() {
    const input = document.getElementById('message');
    const messageText = input.value.trim();
    const activeChatId = sessionStorage.getItem('activeChat');

    if (!messageText) return;

    if (!activeChatId) {
        alert("Nenhum chat selecionado!");
        return;
    }

    try {
        await saveChatMessage(messageText, false, activeChatId);
        loadUserChats();
        input.value = '';
    } catch (error) {
        console.error("Erro ao enviar mensagem:", error);
        alert("Erro ao enviar a mensagem.");
    }
}

document.getElementById('sendMessage').addEventListener('click', handleSendMessage);
document.getElementById('message').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        handleSendMessage();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    loadUserChats();
    
    document.getElementById('splash').style.display = 'flex';
    document.querySelector('.main-chat').style.display = 'none';
});
