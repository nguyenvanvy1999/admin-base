const Footer = () => {
  const currentYear = new Date().getFullYear();
  const version = '1.0.0'; // From package.json

  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
          {/* Left side - Name and Version */}
          <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-gray-400">•</span>
              <span className="text-sm text-gray-500">FinTrack v{version}</span>
              <span className="text-gray-400">•</span>
            </div>
          </div>
        </div>

        {/* Bottom line */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-center text-xs text-gray-500">
            &copy; {currentYear} FinTrack. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
