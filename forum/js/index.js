function markdownToHTML(markdown) {
    const { content, metadata } = extractMetadata(markdown);
    
    let html = content
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`{3}(\w+)?\n([\s\S]*?)\n`{3}/g, (_, lang, code) => 
            `<pre><code class="language-${lang || ''}">${code.trim()}</code></pre>`)
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/!\[([^\]]+)\]\(([^\)]+)\)/g, '<img src="$2" alt="$1" loading="lazy">')
        .replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
        .replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>')
        .replace(/^(?!\<\/?[a-z]+\>|\s*$)(.+)/gm, '<p>$1</p>');

    return { html, metadata };
}

// metadata extraction
function extractMetadata(markdown) {
    const metadataRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = markdown.match(metadataRegex);
    
    if (!match) return { content: markdown, metadata: {} };

    const metadata = {};
    const metadataStr = match[1];
    const content = match[2];

    metadataStr.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length) {
            metadata[key.trim()] = valueParts.join(':').trim();
        }
    });

    return { content, metadata };
}

// toast notification
function showToast(message, type = 'info', duration = 3000) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => toast.classList.remove('show'), duration);
}

// copy to clipboard
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('Link copied to clipboard!', 'success');
    } catch (err) {
        showToast('Failed to copy link', 'error');
    }
}

async function loadAllPosts() {
    try {
        const response = await fetch('/forum/posts/index.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const posts = await response.json();
        
        // sort posts by date if available
        return posts.sort((a, b) => {
            if (a.date && b.date) {
                return new Date(b.date) - new Date(a.date);
            }
            return 0;
        });
    } catch (error) {
        console.error('Error loading posts:', error);
        showToast('Failed to load posts index', 'error');
        return [];
    }
}

// post loading
const postCache = new Map();

async function loadPost(postId) {
    if (postCache.has(postId)) {
        return postCache.get(postId);
    }

    try {
        const response = await fetch(`./posts/${postId}`);
        if (!response.ok) throw new Error('Post not found');
        
        const content = await response.text();
        const { html, metadata } = markdownToHTML(content);

        const cleanExcerpt = html.replace(/<[^>]*>/g, '').split('\n').slice(0, 3).join(' ');

        const post = {
            id: postId,
            title: metadata.title || 'Untitled Post',
            content: html,
            date: metadata.date,
            author: metadata.author,
            excerpt: cleanExcerpt + '...'
        };

        postCache.set(postId, post);
        return post;
    } catch (error) {
        console.error('Error loading post:', error);
        showToast('Failed to load post', 'error');
        return null;
    }
}


// home page display
let currentPage = 1;
const postsPerPage = 10;
let isLoading = false;

async function showHome() {
    const container = document.getElementById('blogContainer');
    container.innerHTML = '<div class="loading">Loading posts...</div>';
    currentPage = 1;
    await loadMorePosts();
    window.history.pushState({}, '', window.location.pathname);
}

async function loadMorePosts() {
    if (isLoading) return;
    isLoading = true;

    try {
        const posts = await loadAllPosts();
        const container = document.getElementById('blogContainer');
        
        const start = (currentPage - 1) * postsPerPage;
        const pagePosts = posts.slice(start, start + postsPerPage);

        if (pagePosts.length === 0) {
            if (currentPage === 1) {
                container.innerHTML = '<div class="blog-post"><p>No posts found.</p></div>';
            }
            return;
        }

        const postsHTML = await Promise.all(pagePosts.map(async post => {
            const postData = await loadPost(post.id);
            if (!postData) return '';
            
            return `
                <article class="blog-post blog-preview" onclick="showPost('${post.id}')" role="button" tabindex="0">
                    <h1>${postData.title}</h1>
                    <div class="blog-meta">
                        ${postData.date ? `<span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v10l4.5 4.5"/><circle cx="12" cy="12" r="10"/></svg>${postData.date}</span>` : ''}
                        ${postData.author ? `<span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>${postData.author}</span>` : ''}
                    </div>
                    <div class="markdown-content">
                        ${markdownToHTML(postData.excerpt).html}
                    </div>
                    <div class="read-more">Read more →</div>
                </article>
            `;
        }));

        if (currentPage === 1) {
            container.innerHTML = postsHTML.join('');
        } else {
            container.insertAdjacentHTML('beforeend', postsHTML.join(''));
        }

        currentPage++;
    } catch (error) {
        console.error('Error loading posts:', error);
        showToast('Failed to load posts', 'error');
    } finally {
        isLoading = false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('post');

    if (postId) {
        showPost(postId);
    } else {
        showHome();
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            showHome();
        }
    });

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !window.location.search.includes('post=')) {
                loadMorePosts();
            }
        });
    });

    const sentinel = document.createElement('div');
    sentinel.className = 'sentinel';
    document.getElementById('blogContainer').appendChild(sentinel);
    observer.observe(sentinel);
});

// post display
async function showPost(postId) {
    const container = document.getElementById('blogContainer');
    container.innerHTML = '<div class="loading">Loading post...</div>';

    const post = await loadPost(postId);
    if (!post) {
        showToast('Post not found', 'error');
        showHome();
        return;
    }

    const content = `
        <article class="blog-post animate-fade-in" id="post-${post.id}">
            <h1 class="animate-slide-down">${post.title}</h1>
            <div class="blog-meta animate-fade-in-delay">
                ${post.date ? `<span class="animate-slide-right"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v10l4.5 4.5"/><circle cx="12" cy="12" r="10"/></svg>${post.date}</span>` : ''}
                ${post.author ? `<span class="animate-slide-right"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>${post.author}</span>` : ''}
                <span class="share-button animate-pulse-hover" onclick="copyToClipboard(window.location.href)" role="button" tabindex="0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                    <path d="M16 6l-4-4-4 4"/>
                    <path d="M12 2v13"/>
                </svg>
                Share
                </span>
            </div>
            <div class="markdown-content animate-fade-in-delay-longer">
                ${post.content}
            </div>
            <div class="post-navigation animate-fade-in-up">
                <button onclick="loadPreviousPost('${post.id}')" class="button previous animate-slide-left-hover">Previous</button>
                <button onclick="loadNextPost('${post.id}')" class="button next animate-slide-right-hover">Next</button>
            </div>
        </article>
    `;

    container.innerHTML = content;
    window.history.pushState({ postId }, '', `?post=${postId}`);
    
    if (window.Prism) {
        Prism.highlightAllUnder(container);
    }

    // Track view
    trackPostView(postId);
}

// post navigation
async function loadPreviousPost(currentPostId) {
    const posts = await loadAllPosts();
    const currentIndex = posts.findIndex(p => p.id === currentPostId);
    if (currentIndex > 0) {
        showPost(posts[currentIndex - 1].id);
    }
}

async function loadNextPost(currentPostId) {
    const posts = await loadAllPosts();
    const currentIndex = posts.findIndex(p => p.id === currentPostId);
    if (currentIndex < posts.length - 1) {
        showPost(posts[currentIndex + 1].id);
    }
}

function trackPostView(postId) {
    try {
        const views = JSON.parse(localStorage.getItem('postViews') || '{}');
        views[postId] = (views[postId] || 0) + 1;
        localStorage.setItem('postViews', JSON.stringify(views));
    } catch (error) {
        console.error('Error tracking post view:', error);
    }
}

window.addEventListener('scroll', () => {
    document.querySelector('.navbar').classList.toggle('scrolled', window.scrollY > 0);
});

// browser navigation
window.addEventListener('popstate', event => {
    if (event.state && event.state.postId) {
        showPost(event.state.postId);
    } else {
        showHome();
    }
});