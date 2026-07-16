import { useFavoritesMoviesStore } from "./stores/favorites";
import { Link } from "react-router";
import "./Favorites.css"

function Favorites() {
  const favorites = useFavoritesMoviesStore(s => s.favorites);

  if (favorites.length === 0) {
    return (
      <section className="movie-row-section">
        <h2 className="movie-row-title">My List</h2>
        <p className="empty-message">まだお気に入りがありません</p>
      </section>
    )
  }
  return (
    <section className="movie-row-section">
      <h2 className="movie-row-title">My List</h2>
      <div className="movie-row-scroll">
        {favorites.map((movie) => (
          <Link key={movie.id} to={`/movies/${movie.id}`} className="movie-card">
            <div className="movie-card__imgwrap">
              <img
                src={`https://image.tmdb.org/t/p/w300_and_h450_bestv2${movie.posterPath}`}
                alt={movie.title}
                className="movie-card__image"
              />
              <div className="movie-card__overlay">
                <h3 className="movie-card__title">{movie.title}</h3>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default Favorites;