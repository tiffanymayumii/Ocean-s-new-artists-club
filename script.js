let currentPostId = '';
let selectedImageURL = '';

// Récupération sécurisée du profil local
const getProfile = () => JSON.parse(localStorage.getItem('art_user_v3')) || { pseudo: "Artiste", avatar: "logo-oceane.png", uid: "guest" };

// Update counts on existing post without re-rendering
function updatePostCounts(postId, likes, comments) {
    const postCard = document.getElementById(postId);
    if (!postCard || postId.startsWith('def')) return;
    
    // Update like count
    const likeBtn = postCard.querySelector('.like-btn');
    if (likeBtn) {
        let likeCountSpan = likeBtn.querySelector('.count-text');
        if (likes > 0) {
            if (!likeCountSpan) {
                likeCountSpan = document.createElement('span');
                likeCountSpan.className = 'count-text';
                likeBtn.appendChild(likeCountSpan);
            }
            likeCountSpan.textContent = likes;
        } else if (likeCountSpan) {
            likeCountSpan.remove();
        }
    }
    
    // Update comment count
    const commentBtn = postCard.querySelector('.post-actions button:nth-child(2)');
    if (commentBtn) {
        let commentCountSpan = commentBtn.querySelector('.count-text');
        const commentCount = Array.isArray(comments) ? comments.length : 0;
        if (commentCount > 0) {
            if (!commentCountSpan) {
                commentCountSpan = document.createElement('span');
                commentCountSpan.className = 'count-text';
                commentBtn.appendChild(commentCountSpan);
            }
            commentCountSpan.textContent = commentCount;
        } else if (commentCountSpan) {
            commentCountSpan.remove();
        }
    }
}

// CHARGEMENT INITIAL (4 PHOTOS PAR DÉFAUT + FIREBASE)
function loadAllPosts() {
    const { db, fbMethods } = window;
    if (!db || !fbMethods) {
        console.error("Firebase n'est pas prêt.");
        return;
    }

    // Render defaults only if feeds are empty
    const digitalFeed = document.getElementById('feed-digital');
    const tradFeed = document.getElementById('feed-traditionnel');
    if (digitalFeed.children.length === 0 && tradFeed.children.length === 0) {
        renderDefaults();
    }

    const q = fbMethods.query(fbMethods.collection(db, "posts"), fbMethods.orderBy("timestamp", "desc"));
    
    // Track which posts we've already rendered
    const renderedPosts = new Set();
    
    fbMethods.onSnapshot(q, (snapshot) => {
        // Process Firebase posts
        snapshot.forEach((doc) => {
            const postId = doc.id;
            const p = doc.data();
            p.id = postId;
            if (typeof p.likes !== 'number') p.likes = 0;
            if (!Array.isArray(p.comments)) p.comments = [];
            
            const existingCard = document.getElementById(postId);
            if (existingCard) {
                // Update existing post counts
                updatePostCounts(postId, p.likes, p.comments);
            } else {
                // New post, render it
                displayPost(p);
            }
            renderedPosts.add(postId);
        });
        
        // Remove posts that were deleted from Firebase (but keep defaults)
        document.querySelectorAll('.post-card').forEach(card => {
            const cardId = card.id;
            if (!cardId.startsWith('def') && !renderedPosts.has(cardId)) {
                card.remove();
            }
        });
        
        renderedPosts.clear();
    }, (error) => {
        console.error("Erreur de lecture Firestore (vérifiez vos règles) :", error);
    });
}

function renderDefaults() {
    const defaults = [
        { id: 'def1', cat: 'digital', img: 'digital1.jpg', name: 'Océane_Digital', loc: 'Paris', desc: 'Mon premier digital art.', likes: 12, comments: [] },
        { id: 'def2', cat: 'digital', img: 'digital2.jpg', name: 'Océane_Digital', loc: 'Suisse', desc: 'Concept.', likes: 8, comments: [] },
        { id: 'def3', cat: 'traditionnel', img: 'trad1.jpg', name: 'Océane_Trad', loc: 'Atelier', desc: 'Aquarelle fleurs.', likes: 15, comments: [] },
        { id: 'def4', cat: 'traditionnel', img: 'trad2.jpg', name: 'Océane_Trad', loc: 'Lyon', desc: 'Portrait fusain.', likes: 9, comments: [] }
    ];
    defaults.forEach(p => displayPost(p));
}

function displayPost(p) {
    const feed = document.getElementById('feed-' + p.cat);
    if (!feed) return;

    const likeCount = p.likes || 0;
    const commentCount = (p.comments && Array.isArray(p.comments)) ? p.comments.length : 0;
    const likeCountText = likeCount > 0 ? `<span class="count-text">${likeCount}</span>` : '';
    const commentCountText = commentCount > 0 ? `<span class="count-text">${commentCount}</span>` : '';

    const html = `
    <div class="post-card" id="${p.id}">
        <div class="post-header"><img src="${p.avatar || 'logo-oceane.png'}" class="user-avatar"><div><strong>${p.name}</strong><br><small>${p.loc}</small></div></div>
        <div class="post-media-box" ondblclick="doubleClickLike('${p.id}')">
            <i class="fa-solid fa-heart like-animation"></i>
            <img src="${p.img}">
        </div>
        <div class="post-footer">
            <div class="post-actions">
                <button class="like-btn" onclick="toggleLike('${p.id}')">
                    <i class="fa-solid fa-heart"></i>
                    ${likeCountText}
                </button>
                <button onclick="openComments('${p.id}')">
                    <i class="fa-regular fa-comment"></i>
                    ${commentCountText}
                </button>
                <button onclick="sharePost('${p.name}', '${p.desc}')"><i class="fa-regular fa-paper-plane"></i></button>
            </div>
            <p><strong>${p.name}</strong> ${p.desc}</p>
        </div>
    </div>`;
    feed.insertAdjacentHTML('beforeend', html);
}

// Convert file to base64 (simple, no CORS issues)
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ACTIONS FIREBASE
async function finalizePost() {
    const { db, fbMethods } = window;
    const file = document.getElementById('imageInput').files[0];
    const user = getProfile();

    if(!file) return alert("Veuillez choisir une photo !");

    // Check file size (Firestore limit is 1MB per field, but we'll allow up to 800KB for safety)
    if (file.size > 800 * 1024) {
        return alert("L'image est trop grande ! Veuillez choisir une image de moins de 800KB.");
    }

    const btn = document.getElementById('btnFinalPublish');
    btn.disabled = true; 
    btn.innerText = "Envoi en cours...";

    try {
        // Convert image to base64 (no CORS issues!)
        const base64Image = await fileToBase64(file);

        // Enregistrement Firestore (image stored as base64)
        await fbMethods.addDoc(fbMethods.collection(db, "posts"), {
            img: base64Image, 
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
        console.error("Erreur d'envoi :", e);
        alert("Erreur d'envoi : " + e.message); 
    } finally {
        btn.disabled = false; 
        btn.innerText = "Publier la photo";
    }
}

async function toggleLike(postId) {
    if(postId.startsWith('def')) {
        const btn = document.getElementById(postId).querySelector('.like-btn');
        const isLiked = btn.classList.contains('is-liked');
        btn.classList.toggle('is-liked');
        
        // Update default post like count
        const countSpan = btn.querySelector('.count-text');
        if (countSpan) {
            const currentCount = parseInt(countSpan.textContent) || 0;
            countSpan.textContent = isLiked ? Math.max(0, currentCount - 1) : currentCount + 1;
            if (parseInt(countSpan.textContent) === 0) countSpan.remove();
        }
        return;
    }
    
    const { db, fbMethods } = window;
    const postRef = fbMethods.doc(db, "posts", postId);
    try {
        await fbMethods.updateDoc(postRef, { likes: fbMethods.increment(1) });
        document.getElementById(postId).querySelector('.like-btn').classList.add('is-liked');
        // Count will update automatically via onSnapshot
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
        const unsubscribe = fbMethods.onSnapshot(fbMethods.doc(db, "posts", id), (doc) => {
            const list = document.getElementById('commentList');
            list.innerHTML = "";
            const data = doc.data();
            
            // Update comment count in the post card
            const postCard = document.getElementById(id);
            if (postCard && data) {
                const commentBtn = postCard.querySelector('.post-actions button:nth-child(2)');
                const commentCount = (data.comments && Array.isArray(data.comments)) ? data.comments.length : 0;
                let countSpan = commentBtn.querySelector('.count-text');
                
                if (commentCount > 0) {
                    if (!countSpan) {
                        countSpan = document.createElement('span');
                        countSpan.className = 'count-text';
                        commentBtn.appendChild(countSpan);
                    }
                    countSpan.textContent = commentCount;
                } else if (countSpan) {
                    countSpan.remove();
                }
            }
            
            if(data && data.comments && data.comments.length > 0) {
                data.comments.forEach(c => {
                    list.innerHTML += `
                    <div style="margin-bottom:15px; display:flex; gap:10px;">
                        <img src="${c.avatar || 'logo-oceane.png'}" style="width:30px;height:30px;border-radius:50%">
                        <div style="background:#f1f1f1;padding:10px;border-radius:15px;flex:1">
                            <strong>${c.user}</strong>: ${c.text}
                        </div>
                    </div>`;
                });
            } else {
                list.innerHTML = "<p style='padding:20px; text-align:center; color:gray'>Aucun commentaire pour le moment.</p>";
            }
        });
        
        // Store unsubscribe function for cleanup if needed
        window.currentCommentUnsubscribe = unsubscribe;
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