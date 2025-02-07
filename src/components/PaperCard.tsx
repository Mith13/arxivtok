import { Component, createMemo, createSignal, For, onMount, Show, Switch, Match } from "solid-js";
import katex from "katex";
import { useFavorites } from "@/lib/favorites";
import { Paper } from "@/lib/papers";

interface LatexParserProps {
    text: string;
    isTitle?: boolean;
}

const PATTERNS = {
    INLINE_MATH: /\$([^\$]+)\$|\\\(([^\)]+)\\\)/g,
    DISPLAY_MATH: /\$\$([^\$]+)\$\$|\\\[([^\]]+)\\\]/g,
    SYMBOLS: {
        "\\alpha": "α",
        "\\beta": "β",
        "\\gamma": "γ",
        "\\delta": "δ",
        "\\epsilon": "ε",
        "\\zeta": "ζ",
        "\\eta": "η",
        "\\theta": "θ",
        "\\iota": "ι",
        "\\kappa": "κ",
        "\\lambda": "λ",
        "\\mu": "μ",
        "\\nu": "ν",
        "\\xi": "ξ",
        "\\pi": "π",
        "\\rho": "ρ",
        "\\sigma": "σ",
        "\\tau": "τ",
        "\\upsilon": "υ",
        "\\phi": "φ",
        "\\chi": "χ",
        "\\psi": "ψ",
        "\\omega": "ω",
        "\\infty": "∞",
        "\\pm": "±",
        "\\times": "×",
        "\\div": "÷",
        "\\leq": "≤",
        "\\geq": "≥",
        "\\neq": "≠",
        "\\approx": "≈",
        "\\cdot": "·",
    },
    FORMATTING: {
        textbf: /\\textbf\{([^}]+)\}/g,
        textit: /\\textit\{([^}]+)\}/g,
        underline: /\\underline\{([^}]+)\}/g,
        emph: /\\emph\{([^}]+)\}/g,
    },
    CITATIONS: /\\cite\{([^}]+)\}/g,
    REFERENCES: /\\ref\{([^}]+)\}/g,
};

const formatText = (text: string) => {
    text = text.replace(
        PATTERNS.FORMATTING.textbf,
        '<span class="font-bold">$1</span>'
    );
    text = text.replace(
        PATTERNS.FORMATTING.textit,
        '<span class="italic">$1</span>'
    );
    text = text.replace(
        PATTERNS.FORMATTING.underline,
        '<span class="underline">$1</span>'
    );
    text = text.replace(
        PATTERNS.FORMATTING.emph,
        '<span class="italic">$1</span>'
    );

    text = text.replace(
        PATTERNS.CITATIONS,
        '<span class="text-blue-500 cursor-pointer">[citation]</span>'
    );
    text = text.replace(
        PATTERNS.REFERENCES,
        '<span class="text-blue-500 cursor-pointer">[ref]</span>'
    );

    Object.entries(PATTERNS.SYMBOLS).forEach(([symbol, replacement]) => {
        text = text.replaceAll(symbol, replacement);
    });

    return text;
};

export const LatexParser: Component<LatexParserProps> = (props) => {
    const parsedContent = createMemo(() => {
        let content = props.text;
        let segments: Array<{
            type: "text" | "math" | "display-math";
            content: string;
        }> = [];
        let lastIndex = 0;

        content = content.replace(PATTERNS.DISPLAY_MATH, (match, g1, g2) => {
            const formula = g1 || g2;
            try {
                return `<div class="my-4 px-4 py-2 overflow-x-auto">${katex.renderToString(
                    formula,
                    { displayMode: true }
                )}</div>`;
            } catch (error) {
                console.error("KaTeX error:", error);
                return `<div class="my-4 px-4 py-2 text-red-500 border border-red-300 rounded bg-red-50">${formula}</div>`;
            }
        });

        const matches = Array.from(content.matchAll(PATTERNS.INLINE_MATH));

        matches.forEach((match) => {
            const formula = match[1] || match[2];
            const startIndex = match.index!;

            if (startIndex > lastIndex) {
                segments.push({
                    type: "text",
                    content: formatText(content.slice(lastIndex, startIndex)),
                });
            }

            try {
                segments.push({
                    type: "math",
                    content: katex.renderToString(formula, {
                        displayMode: false,
                    }),
                });
            } catch (error) {
                console.error("KaTeX error:", error);
                segments.push({
                    type: "text",
                    content: formula,
                });
            }

            lastIndex = startIndex + match[0].length;
        });

        if (lastIndex < content.length) {
            segments.push({
                type: "text",
                content: formatText(content.slice(lastIndex)),
            });
        }

        return segments;
    });

    return (
        <div class={`text-base leading-relaxed text-gray-700 ${props.isTitle ? 'text-xl sm:text-2xl md:text-3xl font-bold leading-tight tracking-tight' : ''}`}>
            <For each={parsedContent()}>
                {(segment) => (
                    <Show
                        when={segment.type === "text"}
                        fallback={
                            <span
                                class={`
                                    ${
                                        segment.type === "display-math"
                                            ? "block my-4"
                                            : "inline"
                                    } 
                                    [&_.katex]:text-lg
                                    [&_.katex-display]:my-4
                                    [&_.katex-display]:overflow-x-auto
                                    [&_.katex-display]:overflow-y-hidden
                                    [&_.katex-display]:py-2
                                `}
                                innerHTML={segment.content}
                            />
                        }
                    >
                        <span innerHTML={segment.content} />
                    </Show>
                )}
            </For>
        </div>
    );
};

interface PaperCardProps {
    paper: Paper;
}

export const PaperCard: Component<PaperCardProps> = (props) => {
    const { isFavorite, addFavorite, removeFavorite } = useFavorites();
    const [isScrollable, setIsScrollable] = createSignal(false);
    const [touchStartY, setTouchStartY] = createSignal(0);
    const [scrollStartPosition, setScrollStartPosition] = createSignal(0);
    const [isInteracting, setIsInteracting] = createSignal(false);
    const [lastTap, setLastTap] = createSignal(0);
    const [showHeartAnimation, setShowHeartAnimation] = createSignal(false);
    let contentRef: HTMLDivElement | undefined;

    onMount(() => {
        if (contentRef) {
            setIsScrollable(contentRef.scrollHeight > contentRef.clientHeight);
        }
    });

    const handleWheel = (e: WheelEvent) => {
        if (!contentRef) return;

        const isAtTop = contentRef.scrollTop === 0;
        const isAtBottom =
            contentRef.scrollTop + contentRef.clientHeight >=
            contentRef.scrollHeight - 1;

        // If we're scrolling up at the top or down at the bottom, let the parent handle it
        if ((e.deltaY < 0 && isAtTop) || (e.deltaY > 0 && isAtBottom)) {
            return;
        }

        // Otherwise, handle the scroll internally and prevent paper change
        e.stopPropagation();
    };

    const handleTouchStart = (e: TouchEvent) => {
        const target = e.target as HTMLElement;
        const isLink = target.tagName.toLowerCase() === 'a' || target.closest('a');
        
        // Siempre permitir interacción con enlaces
        if (isLink) {
            return;
        }

        // Para el resto del contenido, manejar el scroll
        if (contentRef && target.closest('.scrollable-content')) {
            setTouchStartY(e.touches[0].clientY);
            setScrollStartPosition(contentRef.scrollTop);
            e.stopPropagation();
        }
    };

    const handleTouchMove = (e: TouchEvent) => {
        if (!contentRef || !touchStartY()) return;

        const currentY = e.touches[0].clientY;
        const touchDelta = touchStartY() - currentY;
        const isAtTop = contentRef.scrollTop === 0;
        const isAtBottom = contentRef.scrollTop + contentRef.clientHeight >= contentRef.scrollHeight - 1;

        if (!isAtTop && !isAtBottom) {
            e.stopPropagation();
            e.preventDefault();
            contentRef.scrollTop = scrollStartPosition() + touchDelta;
        } else if ((isAtTop && touchDelta > 0) || (isAtBottom && touchDelta < 0)) {
            e.stopPropagation();
            e.preventDefault();
            contentRef.scrollTop = scrollStartPosition() + touchDelta;
        }
    };

    const handleTouchEnd = (e: TouchEvent) => {
        if (isInteracting()) {
            setIsInteracting(false);
            return;
        }

        if (!contentRef) return;

        const isAtTop = contentRef.scrollTop === 0;
        const isAtBottom =
            contentRef.scrollTop + contentRef.clientHeight >=
            contentRef.scrollHeight - 1;

        // Only stop propagation if we're not at the edges
        if (!isAtTop && !isAtBottom) {
            e.stopPropagation();
        }
    };

    const handleDoubleTap = (e: MouseEvent | TouchEvent) => {
        const target = e.target as HTMLElement;
        const isLink = target.tagName.toLowerCase() === 'a' || target.closest('a');
        
        // No interferir con enlaces
        if (isLink) return;

        e.preventDefault();
        e.stopPropagation();
        
        if (e instanceof TouchEvent) {
            const now = Date.now();
            const DOUBLE_TAP_DELAY = 300;
            
            if (now - lastTap() < DOUBLE_TAP_DELAY) {
                toggleFavoriteWithAnimation();
            }
            
            setLastTap(now);
        }
    };

    const handleDoubleClick = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavoriteWithAnimation();
    };

    const toggleFavoriteWithAnimation = () => {
        if (!isFavorite(props.paper.id)) {
            setShowHeartAnimation(true);
            setTimeout(() => setShowHeartAnimation(false), 1000);
        }
        toggleFavorite();
    };

    const toggleFavorite = () => {
        if (isFavorite(props.paper.id)) {
            removeFavorite(props.paper.id);
        } else {
            addFavorite(props.paper);
        }
    };

    return (
        <article class="h-full w-full flex items-center justify-center p-4 sm:p-8">
            <div class="relative paper-card max-w-2xl w-full h-[85vh] rounded-2xl bg-white shadow-xl flex flex-col">
                <div class="absolute top-0 right-0 z-20 p-4">
                    <button
                        onClick={toggleFavorite}
                        class="p-3 bg-white shadow-lg rounded-full hover:bg-gray-50
                               transition-all duration-300 active:scale-95 transform hover:scale-105
                               group"
                    >
                        <svg
                            class={`w-7 h-7 ${
                                isFavorite(props.paper.id)
                                    ? "text-red-500 fill-current"
                                    : "text-gray-400 group-hover:text-gray-600"
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                            />
                        </svg>
                    </button>
                </div>

                <Show when={showHeartAnimation()}>
                    <div class="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
                        <div class="transform animate-like-pop">
                            <svg
                                class="w-32 h-32 text-red-500 drop-shadow-xl"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                            </svg>
                        </div>
                    </div>
                </Show>

                <div
                    ref={contentRef}
                    class="h-full overflow-y-auto overscroll-contain p-6 sm:p-8 scrollbar-thin 
                           scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400 
                           scrollable-content"
                    onWheel={handleWheel}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onDblClick={handleDoubleClick}
                    onClick={handleDoubleTap}
                >
                    <div class="mb-6">
                        <LatexParser text={props.paper.title} isTitle />
                        <div class="flex items-center space-x-2 mt-4">
                            <span class="text-sm text-gray-500">
                                {new Date(
                                    props.paper.published
                                ).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                })}
                            </span>
                            <Show when={props.paper.pdfLink}>
                                <span class="text-gray-300">•</span>
                                <a
                                    href={props.paper.pdfLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="text-blue-500 hover:text-blue-600 text-sm font-medium transition-colors"
                                >
                                    View source
                                </a>
                            </Show>
                        </div>
                    </div>

                    <div class="space-y-4 mb-8">
                        <LatexParser text={props.paper.summary} />
                    </div>
                </div>

                <div class="border-t pt-6">
                    <h3 class="text-sm font-medium text-gray-500 mb-3">
                        Authors
                    </h3>
                    <div class="flex flex-wrap gap-2">
                        {props.paper.authors.map((author) => (
                            <span class="bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-full text-sm text-gray-600 transition-colors">
                                {author}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </article>
    );
};
