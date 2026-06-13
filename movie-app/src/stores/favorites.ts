import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Movie } from "../types/movie";

type favoritesState = {
    favorites: Movie[];

}
