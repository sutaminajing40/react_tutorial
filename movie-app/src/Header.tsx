import { NavLink } from "react-router";
import { useFavoritesMoviesStore } from "./stores/favorites";
import "./Header.css";

function Header({ children }: { children: React.ReactNode }) {
    const count = useFavoritesMoviesStore(s => s.favorites.length);

    return (
        <div className="app-bg">
            <header className="app-header">
                <h1 className="app-title">MOVIEFLIX</h1>
                <nav className="app-nav">
                    <NavLink to="/">Home</NavLink>
                    <NavLink to="/favorites">My List ({count})</NavLink>
                </nav>
            </header>
            <main>{children}</main>
        </div>
    );
}

export default Header;
