const GRADIENTES = {
    naranja: ['#B5445C','#CF6278'], rosa: ['#F2B8C8','#D4869D'],
    dorado: ['#FAF2F5','#F2B8C8'], champagne: ['#F9EBE0','#E8C9B5'],
    coral: ['#FF6B6B','#F2B8C8'], default: ['#FAF2F5','#F2B8C8'],
};

async function quitarFavorita(creadoraId, cardEl) {
    try {
        await candela.fans.quitarFavorito(creadoraId);
        cardEl.style.transition = 'opacity .3s, transform .3s';
        cardEl.style.opacity = '0';
        cardEl.style.transform = 'scale(.95)';
        setTimeout(() => {
            cardEl.remove();
            const lista = document.getElementById('lista');
            if (!lista.children.length) {
                lista.classList.add('hidden');
                document.getElementById('vacio').classList.remove('hidden');
            }
        }, 300);
    } catch(_) {}
}

async function init() {
    if (!requireAuth('suscriptor')) return;
    try {
        const favs = await candela.fans.favoritos();
        document.getElementById('skel').classList.add('hidden');
        if (!favs.length) {
            document.getElementById('vacio').classList.remove('hidden');
            return;
        }
        const lista = document.getElementById('lista');
        lista.classList.remove('hidden');
        lista.innerHTML = favs.map(c => {
            const [c1, c2] = GRADIENTES[c.tema_color] || GRADIENTES.default;
            const inicial = (c.nombre_artistico || '?')[0].toUpperCase();
            const precio = c.precio_suscripcion > 0 ? `${c.precio_suscripcion} USDT/mes` : 'Gratis';
            return `
            <div class="fav-card flex items-center gap-3 p-4" id="fav-${esc(c.id)}">
                <a href="creadora.html?slug=${esc(c.slug)}" class="flex items-center gap-3 flex-1 min-w-0">
                    <div class="w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-white font-bold"
                        style="background:linear-gradient(135deg,${c1},${c2})">
                        ${c.avatar_url
                            ? `<img src="${esc(c.avatar_url)}" class="w-full h-full object-cover rounded-full" alt="">`
                            : inicial}
                    </div>
                    <div class="min-w-0">
                        <p class="font-bold text-c-text truncate">${esc(c.nombre_artistico)}</p>
                        <p class="text-xs text-c-soft">${precio} · ${c.total_suscriptores || 0} fans</p>
                    </div>
                </a>
                <button class="unlike-btn" data-on-click="quitarFavorita('${esc(c.id)}', document.getElementById('fav-${esc(c.id)}'))" title="Quitar de favoritas">
                    <span class="material-symbols-outlined text-c-rose" style="font-size:20px;font-variation-settings:'FILL' 1">favorite</span>
                </button>
            </div>`;
        }).join('');
    } catch(err) {
        document.getElementById('skel').classList.add('hidden');
        document.getElementById('vacio').classList.remove('hidden');
    }
}

init();
