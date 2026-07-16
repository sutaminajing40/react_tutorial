import Header from './Header.tsx'
import { Outlet } from 'react-router';

function Layout() {
    return (
        <Header>
            <Outlet />
        </Header>
    );
}

export default Layout;