import { Link } from "react-router-dom";

function NotFoundPage() {

    return (

        <div className="min-h-screen flex items-center justify-center bg-cream px-6">

            <div className="text-center">

                <p className="text-7xl font-bold text-teal-600">404</p>

                <h1 className="text-3xl font-bold text-gray-900 mt-4">
                    Page not found
                </h1>

                <p className="text-gray-500 mt-3 max-w-md mx-auto">
                    The page you're looking for doesn't exist or may have been moved.
                </p>

                <div className="flex flex-wrap justify-center gap-4 mt-8">

                    <Link
                        to="/"
                        className="px-6 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition"
                    >
                        Back to Home
                    </Link>

                    <Link
                        to="/vendors"
                        className="px-6 py-3 border border-teal-600 text-teal-600 rounded-xl hover:bg-teal-50 transition"
                    >
                        Browse Vendors
                    </Link>

                </div>

            </div>

        </div>

    );

}

export default NotFoundPage;
