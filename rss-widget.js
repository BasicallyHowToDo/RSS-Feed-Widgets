/**
 * RSSWidget v1.0.0
 * A lightweight, zero-dependency RSS feed widget.
 *
 * @example
 *   RSSWidget.init({
 *     feed: 'https://how-to-do.net/feed.xml',
 *     container: '#rss-widget',
 *   });
 *
 * @license MIT
 * @see https://github.com/BasicallyHowToDo/RSS-Feed-Widgets
 */
;(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.RSSWidget = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /*  Defaults                                                          */
  /* ------------------------------------------------------------------ */

  var DEFAULTS = {
    feed:              'https://how-to-do.net/feed.xml',
    container:         '#rss-widget',
    maxItems:          12,
    showFilter:        true,
    showDate:          true,
    descriptionLength: 120,
    theme:             'auto',   // 'auto' | 'light' | 'dark'
    corsProxy:         null,     // e.g. 'https://api.allorigins.win/raw?url='
    skeletonCount:     6,
    onLoad:            null,
    onError:           null,
  };

  /* ------------------------------------------------------------------ */
  /*  Color palette                                                     */
  /* ------------------------------------------------------------------ */

  var PALETTE = [
    { bg: '#eef2ff', fg: '#4338ca' },
    { bg: '#fef2f2', fg: '#dc2626' },
    { bg: '#f0fdf4', fg: '#16a34a' },
    { bg: '#fffbeb', fg: '#d97706' },
    { bg: '#eff6ff', fg: '#2563eb' },
    { bg: '#fdf4ff', fg: '#c026d3' },
    { bg: '#f0fdfa', fg: '#0d9488' },
    { bg: '#fefce8', fg: '#ca8a04' },
    { bg: '#faf5ff', fg: '#9333ea' },
    { bg: '#fff1f2', fg: '#e11d48' },
    { bg: '#ecfdf5', fg: '#059669' },
    { bg: '#f8fafc', fg: '#475569' },
  ];

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                           */
  /* ------------------------------------------------------------------ */

  /**
   * Deterministic color from a string.
   * Uses djb2 hash so the same category always gets the same color.
   *
   * @param  {string} str
   * @return {{ bg: string, fg: string }}
   */
  function colorFor(str) {
    var hash = 5381;
    for (var i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
    }
    return PALETTE[Math.abs(hash) % PALETTE.length];
  }

  /**
   * Truncate text at the nearest word boundary.
   *
   * @param  {string} text
   * @param  {number} max
   * @return {string}
   */
  function truncate(text, max) {
    if (!text) return '';
    if (text.length <= max) return text;
    var trimmed = text.substring(0, max);
    var lastSpace = trimmed.lastIndexOf(' ');
    return (lastSpace > 0 ? trimmed.substring(0, lastSpace) : trimmed) + '\u2026';
  }

  /**
   * Format a Date as "Jun 14, 2026".
   *
   * @param  {Date} d
   * @return {string}
   */
  function formatDate(d) {
    if (!(d instanceof Date) || isNaN(d)) return '';
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  /**
   * Sanitize a string for safe insertion via innerHTML.
   *
   * @param  {string} str
   * @return {string}
   */
  function esc(str) {
    var el = document.createElement('span');
    el.textContent = str;
    return el.innerHTML;
  }

  /**
   * Build an HTML string without setting it until complete.
   * Avoids repeated innerHTML += (reflow on every iteration).
   *
   * @param  {number} n  Number of skeleton cards
   * @return {string}
   */
  function skeletonHTML(n) {
    var card =
      '<div class="rss-skeleton-card">' +
        '<div class="rss-skeleton-line rss-skeleton-badge"></div>' +
        '<div class="rss-skeleton-line rss-skeleton-title"></div>' +
        '<div class="rss-skeleton-line rss-skeleton-title-short"></div>' +
        '<div class="rss-skeleton-line rss-skeleton-date"></div>' +
        '<div class="rss-skeleton-line rss-skeleton-desc"></div>' +
        '<div class="rss-skeleton-line rss-skeleton-desc"></div>' +
        '<div class="rss-skeleton-line rss-skeleton-desc-short"></div>' +
        '<div class="rss-skeleton-line rss-skeleton-link"></div>' +
      '</div>';

    var out = '';
    for (var i = 0; i < n; i++) out += card;
    return out;
  }

  /* ------------------------------------------------------------------ */
  /*  Network                                                           */
  /* ------------------------------------------------------------------ */

  /**
   * Fetch the raw XML text for a feed URL.
   * Optionally routes through a CORS proxy.
   *
   * @param  {string}      url
   * @param  {string|null} proxy
   * @return {Promise<string>}
   */
  function fetchFeed(url, proxy) {
    var target = proxy ? proxy + encodeURIComponent(url) : url;

    return fetch(target).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.text();
    }).then(function (text) {
      if (!text || (!text.includes('<rss') && !text.includes('<feed'))) {
        throw new Error('Response is not a valid RSS/Atom feed');
      }
      return text;
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Parser                                                            */
  /* ------------------------------------------------------------------ */

  /**
   * Parse an RSS 2.0 XML string into a normalised object.
   *
   * @param  {string} xml
   * @return {{ feedTitle: string, feedLink: string, feedDescription: string, items: Array }}
   */
  function parseFeed(xml) {
    var doc = new DOMParser().parseFromString(xml, 'application/xml');

    if (doc.querySelector('parsererror')) {
      throw new Error('XML parse error');
    }

    var channel = doc.querySelector('channel');
    if (!channel) throw new Error('No <channel> element found');

    // querySelector('link') can match <atom:link> in some feeds.
    // Grab the first <link> whose namespaceURI is null (plain RSS).
    var linkEl = Array.from(channel.children).find(function (el) {
      return el.tagName === 'link' && !el.namespaceURI;
    });

    var feedTitle       = (channel.querySelector('title')       || {}).textContent || 'RSS Feed';
    var feedLink        = linkEl ? linkEl.textContent : '#';
    var feedDescription = (channel.querySelector('description') || {}).textContent || '';

    var items = Array.from(doc.querySelectorAll('item')).map(function (item) {
      var raw = (item.querySelector('pubDate') || {}).textContent;
      var date = raw ? new Date(raw) : null;

      return {
        title:       (item.querySelector('title')       || {}).textContent || 'Untitled',
        link:        (item.querySelector('link')        || {}).textContent || '#',
        description: (item.querySelector('description') || {}).textContent || '',
        category:    (item.querySelector('category')    || {}).textContent || 'General',
        pubDate:     date instanceof Date && !isNaN(date) ? date : null,
      };
    });

    return {
      feedTitle:       feedTitle,
      feedLink:        feedLink,
      feedDescription: feedDescription,
      items:           items,
    };
  }

  /* ------------------------------------------------------------------ */
  /*  Renderer                                                          */
  /* ------------------------------------------------------------------ */

  /**
   * Build a single card element.
   *
   * @param  {object}  item
   * @param  {object}  config
   * @return {HTMLElement}
   */
  function buildCard(item, config) {
    var card  = document.createElement('article');
    card.className = 'rss-card';
    card.dataset.category = item.category;

    var color = colorFor(item.category);
    var desc  = truncate(item.description, config.descriptionLength);
    var date  = item.pubDate ? formatDate(item.pubDate) : '';

    var html =
      '<span class="rss-card-category" style="background:' + color.bg + ';color:' + color.fg + '">' +
        esc(item.category) +
      '</span>' +
      '<h3 class="rss-card-title">' +
        '<a href="' + esc(item.link) + '" target="_blank" rel="noopener noreferrer">' +
          esc(item.title) +
        '</a>' +
      '</h3>';

    if (config.showDate && date) {
      html += '<time class="rss-card-date" datetime="' + item.pubDate.toISOString() + '">' + esc(date) + '</time>';
    }

    html +=
      '<p class="rss-card-description">' + esc(desc) + '</p>' +
      '<a class="rss-card-link" href="' + esc(item.link) + '" target="_blank" rel="noopener noreferrer">' +
        'Read guide' +
      '</a>';

    card.innerHTML = html;
    return card;
  }

  /**
   * Attach category-filter buttons above the grid.
   * Uses event delegation on a single listener.
   *
   * @param {object}      feedData
   * @param {HTMLElement}  container
   * @param {HTMLElement}  grid
   */
  function attachFilters(feedData, container, grid) {
    var categories = [];
    var seen = {};

    feedData.items.forEach(function (item) {
      if (!seen[item.category]) {
        seen[item.category] = true;
        categories.push(item.category);
      }
    });

    categories.sort();
    if (categories.length <= 1) return;

    var bar = document.createElement('nav');
    bar.className = 'rss-filters';
    bar.setAttribute('role', 'tablist');
    bar.setAttribute('aria-label', 'Filter by category');

    var html = '<button class="rss-filter active" role="tab" aria-selected="true" data-category="all">All</button>';
    categories.forEach(function (cat) {
      html += '<button class="rss-filter" role="tab" aria-selected="false" data-category="' + esc(cat) + '">' + esc(cat) + '</button>';
    });
    bar.innerHTML = html;

    // Single delegated listener
    bar.addEventListener('click', function (e) {
      var btn = e.target.closest('.rss-filter');
      if (!btn) return;

      // Update active states
      bar.querySelectorAll('.rss-filter').forEach(function (b) {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      var selected = btn.dataset.category;
      var visible = 0;

      grid.querySelectorAll('.rss-card').forEach(function (card) {
        var show = selected === 'all' || card.dataset.category === selected;
        card.style.display = show ? '' : 'none';
        if (show) visible++;
      });

      // Empty state
      var empty = grid.querySelector('.rss-empty');
      if (empty) empty.remove();

      if (visible === 0) {
        var msg = document.createElement('p');
        msg.className = 'rss-empty';
        msg.textContent = 'No guides found in this category.';
        grid.appendChild(msg);
      }
    });

    container.insertBefore(bar, grid);
  }

  /**
   * Render the complete widget into the container.
   *
   * @param {object}      feedData
   * @param {HTMLElement}  container
   * @param {object}      config
   */
  function render(feedData, container, config) {
    container.innerHTML = '';

    // Header
    var header = document.createElement('header');
    header.className = 'rss-header';
    header.innerHTML =
      '<h2><a href="' + esc(feedData.feedLink) + '" target="_blank" rel="noopener noreferrer">' +
        esc(feedData.feedTitle) +
      '</a></h2>' +
      '<p>' + esc(feedData.feedDescription) + '</p>';
    container.appendChild(header);

    // Card grid
    var grid = document.createElement('div');
    grid.className = 'rss-grid';
    grid.setAttribute('role', 'list');

    var items = feedData.items;
    if (config.maxItems > 0) items = items.slice(0, config.maxItems);

    items.forEach(function (item) {
      var card = buildCard(item, config);
      card.setAttribute('role', 'listitem');
      grid.appendChild(card);
    });

    // Filters (inserted before grid, so grid must be in DOM first)
    container.appendChild(grid);

    if (config.showFilter) {
      attachFilters(feedData, container, grid);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Public API                                                        */
  /* ------------------------------------------------------------------ */

  /**
   * Initialise the widget.
   *
   * @param {object} [userConfig]  Merged with DEFAULTS.
   * @return {Promise<void>}
   */
  function init(userConfig) {
    var config = {};
    var key;

    for (key in DEFAULTS) {
      if (DEFAULTS.hasOwnProperty(key)) {
        config[key] = DEFAULTS[key];
      }
    }
    if (userConfig) {
      for (key in userConfig) {
        if (userConfig.hasOwnProperty(key)) {
          config[key] = userConfig[key];
        }
      }
    }

    var container = document.querySelector(config.container);
    if (!container) {
      console.error('[RSSWidget] Container not found: ' + config.container);
      return Promise.resolve();
    }

    // Theme
    container.setAttribute('data-rss-theme', config.theme);
    if (!container.classList.contains('rss-widget')) {
      container.classList.add('rss-widget');
    }

    // Skeleton loading
    var skeleton = document.createElement('div');
    skeleton.className = 'rss-skeleton';
    skeleton.innerHTML = skeletonHTML(config.skeletonCount);
    container.innerHTML = '';
    container.appendChild(skeleton);

    return fetchFeed(config.feed, config.corsProxy)
      .then(function (xml)  { return parseFeed(xml); })
      .then(function (data) {
        render(data, container, config);
        if (typeof config.onLoad === 'function') config.onLoad(data);
      })
      .catch(function (err) {
        container.innerHTML =
          '<div class="rss-error">' +
            '<div class="rss-error-icon">\u26A0</div>' +
            '<p>Could not load the RSS feed. Please try again later.</p>' +
          '</div>';
        console.error('[RSSWidget]', err);
        if (typeof config.onError === 'function') config.onError(err);
      });
  }

  return { init: init };
});
