import Image from 'next/image';
import { Link } from '@/i18n/routing';

export function Footer() {
  return (
    <footer className="mt-auto border-t bg-linear-to-br from-[#FFF8E7] to-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Brand */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Image
                src="/logo.png"
                alt="Glazed & Sipped"
                width={40}
                height={40}
                className="rounded-full shadow-sm object-cover"
              />
              <span className="font-fredoka text-xl font-bold bg-gradient-donut bg-clip-text text-transparent">
                Glazed & Sipped
              </span>
            </div>
            <p className="text-sm text-gray-600">
              Fresh donuts made daily with love. 🍩
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-fredoka text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="text-gray-600 hover:text-[#FF6BBF]">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/products" className="text-gray-600 hover:text-[#FF6BBF]">
                  Products
                </Link>
              </li>
              <li>
                <Link href="/cart" className="text-gray-600 hover:text-[#FF6BBF]">
                  Cart
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-fredoka text-lg font-semibold mb-4">Contact</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>Email: hello@donutshop.com</li>
              <li>Phone: +90 555 123 4567</li>
              <li>Address: Istanbul, Turkey</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t pt-8 text-center text-sm text-gray-600">
          <p>© {new Date().getFullYear()} Glazed & Sipped. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
