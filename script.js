let currentPostId = '';
let selectedImageURL = '';

// Récupération sécurisée du profil local
const getProfile = () => JSON.parse(localStorage.getItem('art_user_v3')) || { pseudo: "Artiste", avatar: "logo-oceane.png", uid: "guest" };

// CHARGEMENT INITIAL (4 PHOTOS PAR DÉFAUT + FIREBASE)
function loadAllPosts() {
    const { db, fbMethods } = window;
    if (!db || !fbMethods) {
        console.error("Firebase n'est pas prêt.");
        return;
    }

    const q = fbMethods.query(fbMethods.collection(db, "posts"), fbMethods.orderBy("timestamp", "desc"));
    
    fbMethods.onSnapshot(q, (snapshot) => {
        document.getElementById('feed-digital').innerHTML = "";
        document.getElementById('feed-traditionnel').innerHTML = "";
        
        // 1. Charger les 4 photos d'origine (Statiques)
        renderDefaults();

        // 2. Charger les photos des utilisateurs en ligne (Firebase)
        snapshot.forEach((doc) => {
            const p = doc.data();
            p.id = doc.id; 
            displayPost(p);
        });
    }, (error) => {
        console.error("Erreur de lecture Firestore (vérifiez vos règles) :", error);
    });
}

function renderDefaults() {
    const defaults = [
        { id: 'def1', cat: 'digital', img: 'digital1.jpg', name: 'Océane_Digital', loc: 'Paris', desc: 'Mon premier digital art.' },
        { id: 'def2', cat: 'digital', img: 'digital2.jpg', name: 'Océane_Digital', loc: 'Suisse', desc: 'Concept.' },
        { id: 'def3', cat: 'traditionnel', img: 'trad1.jpg', name: 'Océane_Trad', loc: 'Atelier', desc: 'Aquarelle fleurs.' },
        { id: 'def4', cat: 'traditionnel', img: 'trad2.jpg', name: 'Océane_Trad', loc: 'Lyon', desc: 'Portrait fusain.' }
    ];
    defaults.forEach(p => displayPost(p));
}

function displayPost(p) {
    const feed = document.getElementById('feed-' + p.cat);
    if (!feed) return;

    const html = `
    <div class="post-card" id="${p.id}">
        <div class="post-header"><img src="${p.avatar || 'logo-oceane.png'}" class="user-avatar"><div><strong>${p.name}</strong><br><small>${p.loc}</small></div></div>
        <div class="post-media-box" ondblclick="doubleClickLike('${p.id}')">
            <i class="fa-solid fa-heart like-animation"></i>
            <img src="${p.img}">
        </div>
        <div class="post-footer">
            <div class="post-actions">
                <button class="like-btn" onclick="toggleLike('${p.id}')"><i class="fa-solid fa-heart"></i></button>
                <button onclick="openComments('${p.id}')"><i class="fa-regular fa-comment"></i></button>
                <button onclick="sharePost('${p.name}', '${p.desc}')"><i class="fa-regular fa-paper-plane"></i></button>
            </div>
            <p><strong>${p.name}</strong> ${p.desc}</p>
        </div>
    </div>`;
    feed.insertAdjacentHTML('beforeend', html);
}

// ACTIONS FIREBASE
async function finalizePost() {
    const { db, storage, fbMethods } = window;
    const file = document.getElementById('imageInput').files[0];
    const user = getProfile();

    if(!file) return alert("Veuillez choisir une photo !");

    const btn = document.getElementById('btnFinalPublish');
    btn.disabled = true; 
    btn.innerText = "Envoi en cours...";

    try {
        // Envoi Image
        const storageRef = fbMethods.ref(storage, 'posts/' + Date.now() + "_" + file.name);
        const snapshot = await fbMethods.uploadBytes(storageRef, file);
        const downloadURL = await fbMethods.getDownloadURL(snapshot.ref);

        // Enregistrement Firestore
        await fbMethods.addDoc(fbMethods.collection(db, "posts"), {
            img: downloadURL, 
            name: user.pseudo, 
            avatar: user.avatar,
            uid: user.uid,
            loc: document.getElementById('userLoc').value || "Ma Ville",
            desc: document.getElementById('postText').value || "",
            cat: document.querySelector('input[name="cat"]:checked').value,
            likes: 0, 
            comments: [], 
            timestamp: Date.now()
        });

        hidePublish();
        triggerSwitch(document.querySelector('input[name="cat"]:checked').value);
    } catch (e) { 
        console.error("Erreur d'envoi (vérifiez CORS et les règles Storage) :", e);
        alert("Erreur d'envoi : " + e.message); 
    } finally {
        btn.disabled = false; 
        btn.innerText = "Publier la photo";
    }
}

async function toggleLike(postId) {
    if(postId.startsWith('def')) return document.getElementById(postId).querySelector('.like-btn').classList.toggle('is-liked');
    
    const { db, fbMethods } = window;
    const postRef = fbMethods.doc(db, "posts", postId);
    try {
        await fbMethods.updateDoc(postRef, { likes: fbMethods.increment(1) });
        document.getElementById(postId).querySelector('.like-btn').classList.add('is-liked');
    } catch (e) { console.error("Erreur like:", e); }
}

async function postComment() {
    const { db, fbMethods } = window;
    const val = document.getElementById('comInput').value;
    const user = getProfile();
    
    if(!val) return;
    if(currentPostId.startsWith('def')) return;

    try {
        const postRef = fbMethods.doc(db, "posts", currentPostId);
        await fbMethods.updateDoc(postRef, {
            comments: fbMethods.arrayUnion({ 
                user: user.pseudo, 
                text: val, 
                avatar: user.avatar,
                date: Date.now()
            })
        });
        document.getElementById('comInput').value = "";
    } catch (e) {
        console.error("Erreur commentaire:", e);
        alert("Impossible de publier le commentaire.");
    }
}

// INTERFACE & UTILS
function openGallery() { document.getElementById('imageInput').click(); }

function handleImageSelection(e) { 
    if(e.target.files[0]) {
        if(selectedImageURL) URL.revokeObjectURL(selectedImageURL);
        selectedImageURL = URL.createObjectURL(e.target.files[0]);
        document.getElementById('imagePreview').innerHTML = `<img src="${selectedImageURL}">`;
        document.getElementById('publishLayer').style.display = 'flex';
    }
}

function hidePublish() { 
    document.getElementById('publishLayer').style.display = 'none';
    if(selectedImageURL) URL.revokeObjectURL(selectedImageURL);
}

function doubleClickLike(id) {
    const heart = document.getElementById(id).querySelector('.like-animation');
    if (heart) {
        heart.classList.add('active');
        toggleLike(id);
        setTimeout(() => heart.classList.remove('active'), 800);
    }
}

function openComments(id) {
    currentPostId = id;
    const drawer = document.getElementById('commentDrawer');
    const footer = drawer.querySelector('.drawer-footer');
    
    drawer.classList.add('active');
    document.getElementById('shade').style.display = 'block';
    
    if(!id.startsWith('def')) {
        footer.style.display = "flex";
        const { db, fbMethods } = window;
        fbMethods.onSnapshot(fbMethods.doc(db, "posts", id), (doc) => {
            const list = document.getElementById('commentList');
            list.innerHTML = "";
            const data = doc.data();
            if(data && data.comments) {
                data.comments.forEach(c => {
                    list.innerHTML += `
                    <div style="margin-bottom:15px; display:flex; gap:10px;">
                        <img src="${c.avatar || 'logo-oceane.png'}" style="width:30px;height:30px;border-radius:50%">
                        <div style="background:#f1f1f1;padding:10px;border-radius:15px;flex:1">
                            <strong>${c.user}</strong>: ${c.text}
                        </div>
                    </div>`;
                });
            }
        });
    } else {
        footer.style.display = "none";
        document.getElementById('commentList').innerHTML = "<p style='padding:20px; text-align:center; color:gray'>Les commentaires sont désactivés pour cette photo de démonstration.</p>";
    }
}

function closeComments() { 
    document.getElementById('commentDrawer').classList.remove('active'); 
    document.getElementById('shade').style.display = 'none'; 
}

async function sharePost(name, desc) {
    if (navigator.share) {
        await navigator.share({ title: 'Océane Art', text: `${name}: ${desc}`, url: window.location.href });
    } else { 
        alert("Lien copié dans le presse-papier !"); 
        navigator.clipboard.writeText(window.location.href);
    }
}

function triggerSwitch(cat) {
    document.getElementById('loader').classList.add('active');
    setTimeout(() => {
        document.querySelectorAll('.feed-section').forEach(s => s.classList.remove('active'));
        document.getElementById('feed-' + cat).classList.add('active');
        document.querySelectorAll('.switch-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(cat === 'digital' ? 'btn-digital' : 'btn-trad').classList.add('active');
        document.getElementById('loader').classList.remove('active');
        window.scrollTo(0,0);
    }, 1200);
}