import { Github, Mail, Shield, Users } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="bg-nexasense-dark text-white py-16">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="space-y-4">
            <h3 className="text-2xl font-heading font-bold bg-gradient-hero bg-clip-text text-transparent">
              NexaSense
            </h3>
            <p className="text-gray-300 font-body leading-relaxed">
              AI-powered study packs that transform your notes into interactive learning experiences.
            </p>
            <div className="flex space-x-4">
              <a 
                href="#" 
                className="text-gray-400 hover:text-accent transition-colors p-2 rounded-lg hover:bg-white/10"
                aria-label="GitHub"
              >
                <Github className="w-5 h-5" />
              </a>
              <a 
                href="#" 
                className="text-gray-400 hover:text-accent transition-colors p-2 rounded-lg hover:bg-white/10"
                aria-label="Email"
              >
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Team */}
          <div className="space-y-4">
            <h4 className="text-lg font-heading font-semibold flex items-center gap-2">
              <Users className="w-5 h-5" />
              Team
            </h4>
            <div className="space-y-2 text-gray-300">
              <a href="#" className="block hover:text-accent transition-colors">About Us</a>
              <a href="#" className="block hover:text-accent transition-colors">Careers</a>
              <a href="#" className="block hover:text-accent transition-colors">Blog</a>
            </div>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h4 className="text-lg font-heading font-semibold">Support</h4>
            <div className="space-y-2 text-gray-300">
              <a href="#" className="block hover:text-accent transition-colors">Help Center</a>
              <a href="#" className="block hover:text-accent transition-colors">Contact</a>
              <a href="#" className="block hover:text-accent transition-colors">Status</a>
            </div>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h4 className="text-lg font-heading font-semibold flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Legal
            </h4>
            <div className="space-y-2 text-gray-300">
              <a href="#" className="block hover:text-accent transition-colors">Privacy Policy</a>
              <a href="#" className="block hover:text-accent transition-colors">Terms of Service</a>
              <a href="#" className="block hover:text-accent transition-colors">Cookie Policy</a>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-gray-700 text-center text-gray-400">
          <p className="font-body">
            © 2025 NexaSense. Built for students, by students 😉.
          </p>
        </div>
      </div>
    </footer>
  );
};