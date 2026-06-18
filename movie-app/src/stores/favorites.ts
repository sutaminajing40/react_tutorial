import { create } from "zustand";
import { persist } from "zustand/middleware";

export type FavoriteMovie = {
    id: number;
    title: string;
    posterPath: string;
}

type FavoritesMovieState = {
    favorites: FavoriteMovie[];
    add: (movie: FavoriteMovie) => void;
    remove: (id: FavoriteMovie['id']) => void;
    isFavorite: (id: FavoriteMovie['id']) => boolean;
    toggle: (movie: FavoriteMovie) => void;
}

export const useFavoritesMoviesStore = create<FavoritesMovieState>()(
    persist(
        (set, get) => ({
            favorites: [],

            add: (movie) => {
                if (!get().isFavorite(movie.id)) {
                    set((state) => ({ favorites: [...state.favorites, movie] }))
                }
            },

            remove: (id) => set((state) => ({ favorites: state.favorites.filter((movie) => movie.id !== id) })),

            isFavorite: (id) => get().favorites.some((m) => m.id === id),

            toggle: (movie) => {
                // if (get().isFavorite(movie.id)) {
                //     get().remove(movie.id)
                // } else {
                //     get().add(movie)
                // }
                get().isFavorite(movie.id)
                    ? get().remove(movie.id)
                    : get().add(movie);
            },
        }),
        { name: "movie-favorites" }
    )
)