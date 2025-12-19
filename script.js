let currentPostId = '';
let selectedImageURL = '';

window.onload = () => {
    addPostToFeed('digital', 'digital1.jpg', 'Océane_Digital', 'Paris', 'Mon premier digital art.');
    addPostToFeed('digital', 'digital2.jpg', 'Océane_Digital', 'Suisse', 'Projet de fin d\'année.');
    addPostToFeed('traditionnel', 'trad1.jpg', 'Océane_Traditionnel', 'Atelier', 'Aquarelle matinale.');
    addPostToFeed('traditionnel', 'trad2.jpg', 'Océane_Traditionnel', 'Lyon', 'Étude de portrait au fusain.');
};

// FONCTION PARTAGER COMME TIKTOK/INSTAGRAM
async function sharePost(title, text) {
    if (navigator.share) {
        try {
            await navigator.share({
                title: title,
                text: text,
                url: window.location.href,
            });
        } catch (err) {
            console.log("Erreur de partage:", err);
        }
    } else {
        // Fallback si l'appareil ne supporte pas le partage natif
        alert("Lien copié dans le presse-papier !");
        navigator.clipboard.writeText(window.location.href);
    }
}

function openGallery() { document.getElementById('imageInput').click(); }

function handleImageSelection(e) {
    const file = e.target.files[0];
    if (file) {
        selectedImageURL = URL.createObjectURL(file);
        document.getElementById('imagePreview').innerHTML = `<img src="${selectedImageURL}">`;
        document.getElementById('publishLayer').style.display = 'flex';
    }
}

function hidePublish() { document.getElementById('publishLayer').style.display = 'none'; }

function finalizePost() {
    const desc = document.getElementById('postText').value;
    const loc = document.getElementById('userLoc').value || "Ma Ville";
    const cat = document.querySelector('input[name="cat"]:checked').value;
    addPostToFeed(cat, selectedImageURL, 'Moi', loc, desc);
    hidePublish();
    triggerSwitch(cat);
}

function addPostToFeed(cat, img, name, loc, desc) {
    const feed = document.getElementById('feed-' + cat);
    const id = "p_" + Date.now() + Math.random();
    const html = `
    <div class="post-card">
        <div class="post-header"><img src="logo-oceane.png" class="user-avatar"><div><strong>${name}</strong><br><small>${loc}</small></div></div>
        <div class="post-media-box" ondblclick="doubleClickLike(this)">
            <i class="fa-solid fa-heart like-animation"></i>
            <img src="${img}">
        </div>
        <div class="post-footer">
            <div class="post-actions">
                <button class="like-btn" onclick="this.classList.toggle('is-liked')"><i class="fa-solid fa-heart"></i></button>
                <button onclick="openComments('${id}')"><i class="fa-regular fa-comment"></i></button>
                <button onclick="sharePost('Océane Art', 'Regarde cette œuvre incroyable !')"><i class="fa-regular fa-paper-plane"></i></button>
            </div>
            <p><strong>${name}</strong> ${desc}</p>
        </div>
    </div>`;
    feed.insertAdjacentHTML('afterbegin', html);
}

function doubleClickLike(container) {
    const heart = container.querySelector('.like-animation');
    heart.classList.add('active');
    container.closest('.post-card').querySelector('.like-btn').classList.add('is-liked');
    setTimeout(() => heart.classList.remove('active'), 800);
}

function postComment() {
    const val = document.getElementById('comInput').value;
    if(!val) return;
    let coms = JSON.parse(localStorage.getItem('com_'+currentPostId)) || [];
    coms.push(val);
    localStorage.setItem('com_'+currentPostId, JSON.stringify(coms));
    document.getElementById('comInput').value = "";
    loadComs();
}

function loadComs() {
    const list = document.getElementById('commentList');
    list.innerHTML = "";
    const coms = JSON.parse(localStorage.getItem('com_'+currentPostId)) || [];
    coms.forEach((c, i) => {
        list.innerHTML += `<div style="margin-bottom:15px; display:flex; gap:10px;"><img src="logo-oceane.png" style="width:30px; height:30px; border-radius:50%"><div style="background:#f1f1f1; padding:10px; border-radius:15px; flex:1"><strong>Moi</strong>: ${c}<div style="font-size:11px; margin-top:5px; color:#999"><span onclick="editCom(${i})" style="cursor:pointer">Modifier</span> • <span onclick="delCom(${i})" style="cursor:pointer">Supprimer</span></div></div></div>`;
    });
}

function delCom(i) { let coms = JSON.parse(localStorage.getItem('com_'+currentPostId)); coms.splice(i,1); localStorage.setItem('com_'+currentPostId, JSON.stringify(coms)); loadComs(); }
function editCom(i) { let coms = JSON.parse(localStorage.getItem('com_'+currentPostId)); let n = prompt("Modifier :", coms[i]); if(n){coms[i]=n; localStorage.setItem('com_'+currentPostId, JSON.stringify(coms)); loadComs();} }

function triggerSwitch(cat) {
    document.getElementById('loader').classList.add('active');
    setTimeout(() => {
        document.querySelectorAll('.feed-section').forEach(s => s.classList.remove('active'));
        document.getElementById('feed-' + cat).classList.add('active');
        document.querySelectorAll('.switch-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('btn-' + (cat==='digital'?'digital':'trad')).classList.add('active');
        document.getElementById('loader').classList.remove('active');
        window.scrollTo(0,0);
    }, 1500);
}

function openComments(id) { currentPostId = id; document.getElementById('commentDrawer').classList.add('active'); document.getElementById('shade').style.display = 'block'; loadComs(); }
function closeComments() { document.getElementById('commentDrawer').classList.remove('active'); document.getElementById('shade').style.display = 'none'; }