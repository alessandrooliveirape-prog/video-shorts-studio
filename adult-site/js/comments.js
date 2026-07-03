/* ============================================
   PLEASUREHUB - Comments System
   Comentários salvos em localStorage
   ============================================ */

const COMMENTS = {
  _storageKey: 'ph_comments',
  _comments: {},

  /* --- Inicializar --- */
  init() {
    this._load();
    console.log('[Comments] Sistema de comentários carregado');
  },

  /* --- Carregar comentários do localStorage --- */
  _load() {
    try {
      const stored = localStorage.getItem(this._storageKey);
      this._comments = stored ? JSON.parse(stored) : {};
    } catch (e) {
      this._comments = {};
    }
  },

  /* --- Salvar comentários no localStorage --- */
  _save() {
    try {
      localStorage.setItem(this._storageKey, JSON.stringify(this._comments));
    } catch (e) {
      console.warn('[Comments] Erro ao salvar comentários:', e);
    }
  },

  /* --- Obter comentários de um vídeo --- */
  getComments(videoId) {
    return this._comments[videoId] || [];
  },

  /* --- Adicionar comentário a um vídeo --- */
  addComment(videoId, data) {
    if (!this._comments[videoId]) {
      this._comments[videoId] = [];
    }

    const comment = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      videoId: videoId,
      author: data.author || 'Anônimo',
      text: data.text.trim(),
      likes: 0,
      dislikes: 0,
      date: new Date().toISOString(),
      replies: [],
    };

    if (!comment.text) return null;

    this._comments[videoId].unshift(comment);
    this._save();
    return comment;
  },

  /* --- Adicionar resposta a um comentário --- */
  addReply(videoId, commentId, data) {
    const comments = this._comments[videoId];
    if (!comments) return null;

    const comment = comments.find(c => c.id === commentId);
    if (!comment) return null;

    const reply = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      author: data.author || 'Anônimo',
      text: data.text.trim(),
      likes: 0,
      date: new Date().toISOString(),
    };

    if (!reply.text) return null;

    comment.replies.push(reply);
    this._save();
    return reply;
  },

  /* --- Curtir comentário --- */
  toggleLike(videoId, commentId) {
    const comments = this._comments[videoId];
    if (!comments) return;
    const comment = comments.find(c => c.id === commentId);
    if (comment) {
      comment.likes += 1;
      this._save();
      return comment.likes;
    }
  },

  /* --- Excluir comentário --- */
  deleteComment(videoId, commentId) {
    const comments = this._comments[videoId];
    if (!comments) return false;
    
    const index = comments.findIndex(c => c.id === commentId);
    if (index === -1) return false;
    
    comments.splice(index, 1);
    this._save();
    return true;
  },

  /* --- Renderizar comentários no container --- */
  renderComments(containerId, videoId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const comments = this.getComments(videoId);
    
    container.innerHTML = `
      <div class="comments-header">
        <h3 class="comments-title">💬 Comentários <span class="comments-count">(${comments.length})</span></h3>
      </div>
      
      <div class="comment-form">
        <div class="comment-form-row">
          <input type="text" id="commentAuthor" class="comment-input" placeholder="Seu nome (opcional)" maxlength="30">
        </div>
        <div class="comment-form-row">
          <textarea id="commentText" class="comment-textarea" placeholder="Deixe seu comentário..." rows="3" maxlength="500"></textarea>
        </div>
        <div class="comment-form-row" style="display:flex;justify-content:space-between;align-items:center;">
          <span class="comment-char-count" id="commentCharCount">0/500</span>
          <button id="commentSubmitBtn" class="btn-primary" style="padding:10px 24px;font-size:0.85rem;">Enviar comentário</button>
        </div>
      </div>
      
      <div class="comments-list">
        ${comments.length === 0 
          ? '<div class="comments-empty">Nenhum comentário ainda. Seja o primeiro!</div>'
          : comments.map(c => this._renderCommentHTML(c, videoId)).join('')}
      </div>
    `;

    this._bindEvents(container, videoId);
  },

  /* --- Renderizar HTML de um comentário --- */
  _renderCommentHTML(comment, videoId) {
    const date = new Date(comment.date);
    const formattedDate = date.toLocaleDateString('pt-BR', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const repliesHTML = comment.replies.length > 0 
      ? `<div class="comment-replies">
          ${comment.replies.map(r => `
            <div class="comment-reply">
              <div class="comment-avatar" style="background:linear-gradient(135deg,#6c5ce7,#a29bfe);">${r.author.charAt(0).toUpperCase()}</div>
              <div class="comment-body">
                <div class="comment-author">${this._escapeHtml(r.author)} <span class="comment-date">${new Date(r.date).toLocaleDateString('pt-BR', {day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</span></div>
                <div class="comment-text">${this._escapeHtml(r.text)}</div>
              </div>
            </div>
          `).join('')}
        </div>`
      : '';

    return `
      <div class="comment-item" data-comment-id="${comment.id}">
        <div class="comment-avatar" style="background:linear-gradient(135deg,${this._getAvatarColor(comment.author)},${this._getAvatarColor2(comment.author)})">${comment.author.charAt(0).toUpperCase()}</div>
        <div class="comment-body">
          <div class="comment-author">${this._escapeHtml(comment.author)} <span class="comment-date">${formattedDate}</span></div>
          <div class="comment-text">${this._escapeHtml(comment.text)}</div>
          <div class="comment-actions">
            <button class="comment-action like-btn" data-video="${videoId}" data-comment="${comment.id}">👍 <span>${comment.likes}</span></button>
            <button class="comment-action reply-btn" data-comment-id="${comment.id}">💬 Responder</button>
            <button class="comment-action delete-btn" data-video="${videoId}" data-comment="${comment.id}">🗑️</button>
          </div>
          <div class="reply-form" id="replyForm-${comment.id}" style="display:none;">
            <input type="text" class="reply-author-input" placeholder="Seu nome" maxlength="30">
            <textarea class="reply-text-input" placeholder="Escreva sua resposta..." rows="2" maxlength="300"></textarea>
            <button class="btn-primary reply-submit-btn" style="padding:8px 16px;font-size:0.8rem;" data-video="${videoId}" data-comment="${comment.id}">Responder</button>
          </div>
          ${repliesHTML}
        </div>
      </div>
    `;
  },

  /* --- Bind de eventos --- */
  _bindEvents(container, videoId) {
    const submitBtn = container.querySelector('#commentSubmitBtn');
    const textInput = container.querySelector('#commentText');
    const authorInput = container.querySelector('#commentAuthor');
    const charCount = container.querySelector('#commentCharCount');

    // Contagem de caracteres
    if (textInput && charCount) {
      textInput.addEventListener('input', () => {
        charCount.textContent = `${textInput.value.length}/500`;
      });
    }

    // Enviar comentário
    if (submitBtn && textInput) {
      submitBtn.addEventListener('click', () => {
        const author = authorInput ? authorInput.value.trim() || 'Anônimo' : 'Anônimo';
        const text = textInput.value.trim();
        if (!text) return;

        const comment = this.addComment(videoId, { author, text });
        if (comment) {
          this.renderComments(container.id, videoId);
        }
      });

      textInput.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
          submitBtn.click();
        }
      });
    }

    // Like buttons
    container.querySelectorAll('.like-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const video = btn.dataset.video;
        const commentId = btn.dataset.comment;
        const likes = this.toggleLike(video, commentId);
        if (likes) {
          btn.querySelector('span').textContent = likes;
        }
        btn.classList.add('liked');
      });
    });

    // Delete buttons
    container.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('Excluir este comentário?')) {
          const video = btn.dataset.video;
          const commentId = btn.dataset.comment;
          if (this.deleteComment(video, commentId)) {
            this.renderComments(container.id, video);
          }
        }
      });
    });

    // Reply buttons - show/hide form
    container.querySelectorAll('.reply-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const commentId = btn.dataset.commentId;
        const form = container.querySelector(`#replyForm-${commentId}`);
        if (form) {
          form.style.display = form.style.display === 'none' ? 'block' : 'none';
        }
      });
    });

    // Reply submit
    container.querySelectorAll('.reply-submit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const commentId = btn.dataset.comment;
        const form = btn.closest('.reply-form');
        const authorInput = form.querySelector('.reply-author-input');
        const textInput = form.querySelector('.reply-text-input');
        
        const author = authorInput ? authorInput.value.trim() || 'Anônimo' : 'Anônimo';
        const text = textInput ? textInput.value.trim() : '';
        if (!text) return;

        const reply = this.addReply(videoId, commentId, { author, text });
        if (reply) {
          this.renderComments(container.id, videoId);
        }
      });
    });
  },

  /* --- Utilitários --- */
  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  _getAvatarColor(name) {
    const colors = ['#ff2d5c', '#b829e0', '#6c5ce7', '#e84393', '#00b894', '#e17055', '#fd79a8', '#a29bfe'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  },

  _getAvatarColor2(name) {
    const colors = ['#e84393', '#fd79a8', '#a29bfe', '#6c5ce7', '#00cec9', '#d63031', '#e17055', '#00b894'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash + 7) % colors.length];
  }
};

// Inicializar
COMMENTS.init();
window.COMMENTS = COMMENTS;
