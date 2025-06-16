Here’s a tailored guide for installing and using Jekyll, especially since your goal is GitHub Pages compatibility and your project uses Liquid templates (like _layouts/homepage.html, etc.).

1. Jekyll is a Ruby-based tool. You need Ruby (version 2.5 or newer).

sudo apt update
sudo apt install ruby-full build-essential zlib1g-dev

2. Set up your Ruby environment : add these lines to your ~/.bashrc or ~/.zshrc:

export GEM_HOME="$HOME/gems"
export PATH="$HOME/gems/bin:$PATH"

Then reload your shell:
source ~/.bashrc

3. Install Jekyll and Bundler
gem install jekyll bundler

4. Configure Your Existing Project
a. Create a Gemfile in your project root (if you don’t have one):

source 'https://rubygems.org'
gem 'jekyll'

b. Install dependencies in your project directory:
bundle install

5. Serve Your Site Locally : from your project directory (where your _layouts, index.html, etc. are):
bundle exec jekyll serve

    By default, it serves at http://localhost:4000
    Jekyll will process your Liquid templates and content just like GitHub Pages does!

