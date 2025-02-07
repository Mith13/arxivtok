import { createSignal, onMount, For, createEffect, Show } from "solid-js";
import { PaperCard } from "@/components/PaperCard";
import { SearchBar } from "@/components/SearchBar";
import { AboutDialog } from "@/components/ui/AboutDialog";
import { fetchPapers, Paper } from "@/lib/papers";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { QueryBadge } from "@/components/QueryBadge";
import { favorites, loadFavorites, setFavorites } from "@/lib/favorites";
import { FavoritesModal } from "@/components/FavoritesModal";

const defaultQueries = [
    "Artificial Intelligence",
    "Machine Learning",
    "Computation and Language",
    "Computer Vision",
    "Neural and Evolutionary Computing",
    "Machine Learning"
];

export default function Home() {
    const [papers, setPapers] = createSignal<any[]>([]);
    const [currentIndex, setCurrentIndex] = createSignal(0);
    const [page, setPage] = createSignal(0);
    const [isLoading, setIsLoading] = createSignal(false);
    const [isAboutOpen, setIsAboutOpen] = createSignal(false);
    const [currentSource, setCurrentSource] = createSignal<"arxiv" | "medrxiv" | "biorxiv" | "pubmed" | "hackernews">("arxiv");
    const [isScrolling, setIsScrolling] = createSignal(false);
    const [activeQueries, setActiveQueries] = createSignal<string[]>(defaultQueries);
    const [showAllQueries] = createSignal(false);
    const [showFavorites, setShowFavorites] = createSignal(false);
    const scrollCooldown = 200; 
    const [swipeStartY, setSwipeStartY] = createSignal(0);
    const [swipeStartTime, setSwipeStartTime] = createSignal(0);
    const [isCardInteraction, setIsCardInteraction] = createSignal(false);
    const MIN_SWIPE_DISTANCE = 30;
    const MIN_SWIPE_VELOCITY = 0.3;
    const [swipeDirection, setSwipeDirection] = createSignal<'up' | 'down' | null>(null);

    const loadPapers = async (reset = false) => {
        if (isLoading()) return;
        setIsLoading(true);
        try {
            const newPapers = await fetchPapers({
                page: reset ? 0 : page(),
                perPage: 10,
                queries: activeQueries(),
                source: currentSource(),
            });
            setPapers(reset ? newPapers : [...papers(), ...newPapers]);
            setPage(reset ? 1 : page() + 1);
            if (reset) setCurrentIndex(0);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = (query: string) => {
        setActiveQueries(prev => [...new Set([...prev, query])]);
        loadPapers(true);
    };

    const removeQuery = (queryToRemove: string) => {
        setActiveQueries(prev => prev.filter(q => q !== queryToRemove));
        loadPapers(true);
    };

    const scrollToNext = () => {
        if (!isScrolling() && currentIndex() < papers().length - 1) {
            setSwipeDirection('up');
            setIsScrolling(true);
            setCurrentIndex((i) => i + 1);
            setTimeout(() => {
                setIsScrolling(false);
                setSwipeDirection(null);
            }, scrollCooldown);
        }

        if (currentIndex() >= papers().length - 2) {
            loadPapers();
        }
    };

    const scrollToPrevious = () => {
        if (!isScrolling() && currentIndex() > 0) {
            setSwipeDirection('down');
            setIsScrolling(true);
            setCurrentIndex((i) => i - 1);
            setTimeout(() => {
                setIsScrolling(false);
                setSwipeDirection(null);
            }, scrollCooldown);
        }
    };

    const handleScroll = (e: WheelEvent) => {
        e.preventDefault();
        if (isLoading() || isScrolling()) return;

        if (e.deltaY > 0) {
            scrollToNext();
        } else if (e.deltaY < 0) {
            scrollToPrevious();
        }
    };

    const handleTouchStart = (e: TouchEvent) => {
        // Solo capturar swipes si no estamos interactuando con el contenido de la card
        if ((e.target as HTMLElement).closest('.scrollable-content')) {
            setIsCardInteraction(true);
            return;
        }

        setSwipeStartY(e.touches[0].clientY);
        setSwipeStartTime(Date.now());
        setIsCardInteraction(false);
    };

    const handleTouchMove = (e: TouchEvent) => {
        if (isCardInteraction()) return;

        const deltaY = swipeStartY() - e.touches[0].clientY;
        if (Math.abs(deltaY) > 5) {
            e.preventDefault();
        }
    };

    const handleTouchEnd = (e: TouchEvent) => {
        if (isCardInteraction() || isLoading() || isScrolling()) return;

        const endY = e.changedTouches[0].clientY;
        const deltaY = swipeStartY() - endY;
        const deltaTime = (Date.now() - swipeStartTime()) / 1000; // en segundos
        const velocity = Math.abs(deltaY / deltaTime);

        if (Math.abs(deltaY) > MIN_SWIPE_DISTANCE || velocity > MIN_SWIPE_VELOCITY) {
            if (deltaY > 0) {
                scrollToNext();
            } else {
                scrollToPrevious();
            }
        }
    };

    const NoResults = () => (
        <div class="h-full w-full flex flex-col items-center justify-center p-8 text-center">
            <div class="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-xl max-w-md mx-auto">
                <Show
                    when={!isLoading()}
                    fallback={
                        <>
                            <div class="w-16 h-16 mx-auto mb-6 rounded-full border-4 border-gray-200 border-t-blue-500 animate-spin" />
                            <h3 class="text-xl font-semibold text-gray-800 mb-2">Loading papers...</h3>
                            <p class="text-gray-600">Please wait while we fetch the latest research</p>
                        </>
                    }
                >
                    <svg 
                        class="w-16 h-16 mx-auto mb-6 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path 
                            stroke-linecap="round" 
                            stroke-linejoin="round" 
                            stroke-width="1.5"
                            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" 
                        />
                    </svg>
                    <h3 class="text-xl font-semibold text-gray-800 mb-2">No papers found</h3>
                    <p class="text-gray-600 mb-6">
                        {activeQueries().length > 0 
                            ? "Try adjusting your search filters or try a different query" 
                            : "No papers match your current criteria"}
                    </p>
                    <Show when={activeQueries().length > 0}>
                        <button
                            onClick={() => {
                                setActiveQueries([]);
                                loadPapers(true);
                            }}
                            class="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                            <svg 
                                class="w-4 h-4 mr-2" 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                            >
                                <path 
                                    stroke-linecap="round" 
                                    stroke-linejoin="round" 
                                    stroke-width="2" 
                                    d="M19 12H5m7 7l-7-7 7-7"
                                />
                            </svg>
                            Clear filters
                        </button>
                    </Show>
                </Show>
            </div>
        </div>
    );

    onMount(() => {
        loadPapers();
        setFavorites(loadFavorites());
        window.addEventListener("wheel", handleScroll, { passive: false });
        window.addEventListener("touchstart", handleTouchStart, { passive: true });
        window.addEventListener("touchmove", handleTouchMove, { passive: false });
        window.addEventListener("touchend", handleTouchEnd, { passive: true });

        return () => {
            window.removeEventListener("wheel", handleScroll);
            window.removeEventListener("touchstart", handleTouchStart);
            window.removeEventListener("touchmove", handleTouchMove);
            window.removeEventListener("touchend", handleTouchEnd);
        };
    });

    const handleSelectFavorite = (paper: Paper) => {
        const existingIndex = papers().findIndex(p => p.id === paper.id);
        if (existingIndex >= 0) {
            setCurrentIndex(existingIndex);
        } else {
            setPapers(prev => [paper, ...prev]);
            setCurrentIndex(0);
        }
        setShowFavorites(false);
    };

    return (
        <main class="h-screen w-screen overflow-hidden touch-none overscroll-none">
            <div class="fixed top-0 left-0 right-0 z-50 h-16 px-3 sm:px-6 bg-gradient-to-b from-white/80 to-transparent backdrop-blur-sm">
                <div class="max-w-7xl mx-auto h-full flex items-center relative">
                    <div class="flex-none flex items-center space-x-2 sm:space-x-4 h-full">
                        <div class="flex-shrink-0">
                            <div>
                                <h1 class="text-xl sm:text-2xl font-bold tracking-tight">
                                    <span class="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                                        ArXiv
                                    </span>
                                    <span class="text-gray-900">Tok</span>
                                </h1>
                                <p class="hidden sm:block text-sm text-gray-500 mt-1">
                                    Discover research, swipe by swipe
                                </p>
                            </div>
                        </div>

                        <div class="flex items-center pl-4 border-l border-gray-200">
                            <DropdownMenu>
                                <DropdownMenuTrigger class="inline-flex items-center justify-center rounded-md px-2 sm:px-3 py-1.5 text-sm font-medium bg-white hover:bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                                    <span class="mr-2">
                                        {currentSource() === "arxiv"
                                            ? "arXiv"
                                            : currentSource() === "medrxiv"
                                            ? "medRxiv"
                                            : currentSource() === "biorxiv"
                                            ? "bioRxiv"
                                            : currentSource() === "pubmed"
                                            ? "PubMed"
                                            : "HackerNews"}
                                    </span>
                                    <svg
                                        class="w-4 h-4 text-gray-500"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M19 9l-7 7-7-7"
                                        />
                                    </svg>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem
                                        onClick={() => {
                                            setCurrentSource("arxiv");
                                            loadPapers(true);
                                        }}
                                    >
                                        <div class="flex items-center">
                                            <svg
                                                class={`w-4 h-4 mr-2 ${
                                                    currentSource() === "arxiv"
                                                        ? "text-blue-500"
                                                        : "text-transparent"
                                                }`}
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    stroke-linecap="round"
                                                    stroke-linejoin="round"
                                                    stroke-width="2"
                                                    d="M5 13l4 4L19 7"
                                                />
                                            </svg>
                                            <span>arXiv</span>
                                        </div>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => {
                                            setCurrentSource("medrxiv");
                                            loadPapers(true);
                                        }}
                                    >
                                        <div class="flex items-center">
                                            <svg
                                                class={`w-4 h-4 mr-2 ${
                                                    currentSource() ===
                                                    "medrxiv"
                                                        ? "text-blue-500"
                                                        : "text-transparent"
                                                }`}
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    stroke-linecap="round"
                                                    stroke-linejoin="round"
                                                    stroke-width="2"
                                                    d="M5 13l4 4L19 7"
                                                />
                                            </svg>
                                            <span>medRxiv</span>
                                        </div>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => {
                                            setCurrentSource("biorxiv");
                                            loadPapers(true);
                                        }}
                                    >
                                        <div class="flex items-center">
                                            <svg
                                                class={`w-4 h-4 mr-2 ${
                                                    currentSource() ===
                                                    "biorxiv"
                                                        ? "text-blue-500"
                                                        : "text-transparent"
                                                }`}
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    stroke-linecap="round"
                                                    stroke-linejoin="round"
                                                    stroke-width="2"
                                                    d="M5 13l4 4L19 7"
                                                />
                                            </svg>
                                            <span>bioRxiv</span>
                                        </div>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => {
                                            setCurrentSource("pubmed");
                                            loadPapers(true);
                                        }}
                                    >
                                        <div class="flex items-center">
                                            <svg
                                                class={`w-4 h-4 mr-2 ${
                                                    currentSource() === "pubmed"
                                                        ? "text-blue-500"
                                                        : "text-transparent"
                                                }`}
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    stroke-linecap="round"
                                                    stroke-linejoin="round"
                                                    stroke-width="2"
                                                    d="M5 13l4 4L19 7"
                                                />
                                            </svg>
                                            <span>PubMed</span>
                                        </div>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => {
                                            setCurrentSource("hackernews");
                                            loadPapers(true);
                                        }}
                                    >
                                        <div class="flex items-center">
                                            <svg
                                                class={`w-4 h-4 mr-2 ${
                                                    currentSource() ===
                                                    "hackernews"
                                                        ? "text-blue-500"
                                                        : "text-transparent"
                                                }`}
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    stroke-linecap="round"
                                                    stroke-linejoin="round"
                                                    stroke-width="2"
                                                    d="M5 13l4 4L19 7"
                                                />
                                            </svg>
                                            <span>HackerNews</span>
                                        </div>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                    <Show when={activeQueries().length > 0}>
                        <div class="flex-1 mx-4 min-w-0">
                            <div class="w-full flex items-center gap-1.5 p-1.5 rounded-full bg-white/90 backdrop-blur-sm shadow-sm">
                                <div class="flex-1 min-w-0 flex items-center gap-1.5 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                                    {activeQueries().map((query) => (
                                        <QueryBadge
                                            query={query}
                                            onRemove={() => removeQuery(query)}
                                            compact={!showAllQueries()}
                                        />
                                    ))}
                                </div>
                                <button
                                    onClick={() => {
                                        setActiveQueries([]);
                                        loadPapers(true);
                                    }}
                                    class="ml-1 p-1 -mr-0.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100/50"
                                    title="Clear all filters"
                                >
                                    <svg
                                        class="w-3.5 h-3.5"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M6 18L18 6M6 6l12 12"
                                        />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </Show>
                </div>
            </div>

            <AboutDialog isOpen={isAboutOpen()} onOpenChange={setIsAboutOpen} />

            <SearchBar onSearch={handleSearch} />

            <div class="relative h-full w-full">
                <Show when={papers().length > 0} fallback={<NoResults />}>
                    <For each={papers()}>
                        {(paper, index) => (
                            <div
                                class="absolute w-full h-full transition-all duration-300 ease-out will-change-transform"
                                style={{
                                    opacity: index() === currentIndex() 
                                        ? 1 
                                        : swipeDirection() === 'up' && index() < currentIndex()
                                        ? 0.3  
                                        : swipeDirection() === 'down' && index() > currentIndex()
                                        ? 0.3  
                                        : 0.8,
                                    scale: index() === currentIndex() 
                                        ? 1 
                                        : swipeDirection() === 'up' && index() < currentIndex()
                                        ? 0.9 
                                        : swipeDirection() === 'down' && index() > currentIndex()
                                        ? 0.9  
                                        : 0.95,
                                    perspective: '1000px',
                                    transform: `translateY(${(index() - currentIndex()) * 100}vh) rotateX(${
                                        index() === currentIndex()
                                            ? '0deg'
                                            : swipeDirection() === 'up' && index() < currentIndex()
                                            ? '-5deg'  
                                            : swipeDirection() === 'down' && index() > currentIndex()
                                            ? '5deg'   
                                            : '0deg'
                                    })`
                                }}
                            >
                                <PaperCard paper={paper} />
                            </div>
                        )}
                    </For>
                </Show>
            </div>

            {/* Fixed bottom buttons */}
            <div class="fixed bottom-6 w-full px-6 flex justify-between items-center z-30">
                <button
                    onClick={() => setIsAboutOpen(true)}
                    class="p-3 bg-white/90 backdrop-blur-sm shadow-lg rounded-full 
                           hover:bg-white transition-all duration-300 group
                           hover:scale-105 active:scale-95"
                    title="About ArXivTok"
                >
                    <svg
                        class="w-6 h-6 text-gray-600 group-hover:text-gray-800"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                </button>

                <button
                    onClick={() => setShowFavorites(true)}
                    class="flex items-center space-x-2 px-4 py-3 bg-white/90 backdrop-blur-sm
                           shadow-lg rounded-full hover:bg-white transition-all duration-300
                           hover:scale-105 active:scale-95 group"
                >
                    <svg
                        class="w-6 h-6 text-red-500"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                    <span class="font-medium text-gray-700 group-hover:text-gray-900">
                        {favorites().length}
                    </span>
                </button>
            </div>

            <FavoritesModal
                isOpen={showFavorites()}
                onClose={() => setShowFavorites(false)}
                onSelectPaper={handleSelectFavorite}
            />
        </main>
    );
}