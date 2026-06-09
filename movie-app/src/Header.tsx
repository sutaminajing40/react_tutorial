function Header({ children }: { children: React.ReactNode }) {
    return (
        <div className="app-bg">
            <header className="app-header">
                <h1 className="app-title">MOVIEFLIX</h1>
            </header>
            <main>{children}</main>
        </div>
    );
}

export default Header;
