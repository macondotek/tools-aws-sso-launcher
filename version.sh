#!/bin/bash

# AWS SSO Launcher - Version Management Script
# This script helps manage semantic versioning for the Chrome extension

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to display usage
usage() {
    echo "Usage: $0 [patch|minor|major|show|set <version>]"
    echo ""
    echo "Commands:"
    echo "  patch    - Increment patch version (1.0.0 -> 1.0.1)"
    echo "  minor    - Increment minor version (1.0.0 -> 1.1.0)"
    echo "  major    - Increment major version (1.0.0 -> 2.0.0)"
    echo "  show     - Show current version"
    echo "  set      - Set specific version (e.g., set 1.2.3)"
    echo ""
    echo "Examples:"
    echo "  $0 patch          # Bug fixes"
    echo "  $0 minor          # New features"
    echo "  $0 major          # Breaking changes"
    echo "  $0 set 2.1.0      # Set specific version"
}

# Function to get current version from manifest.json
get_current_version() {
    grep '"version"' manifest.json | sed 's/.*"version": *"\([^"]*\)".*/\1/'
}

# Function to update version in manifest.json
update_manifest_version() {
    local new_version=$1
    sed -i.bak "s/\"version\": *\"[^\"]*\"/\"version\": \"$new_version\"/" manifest.json
    rm manifest.json.bak
    echo -e "${GREEN}✓${NC} Updated manifest.json to version $new_version"
}

# Function to create git tag
create_tag() {
    local version=$1
    local tag_name="v$version"
    
    # Check if tag already exists
    if git tag -l | grep -q "^$tag_name$"; then
        echo -e "${RED}✗${NC} Tag $tag_name already exists!"
        exit 1
    fi
    
    # Create annotated tag
    git tag -a "$tag_name" -m "Release $tag_name: AWS SSO Launcher

This release includes:
- Version $version of the AWS SSO Launcher Chrome Extension
- See CHANGELOG.md for detailed changes

For more information, visit: https://github.com/macondotek/tools-aws-sso-launcher"
    
    echo -e "${GREEN}✓${NC} Created tag $tag_name"
}

# Function to increment version
increment_version() {
    local current_version=$1
    local increment_type=$2
    
    # Split version into parts
    IFS='.' read -r major minor patch <<< "$current_version"
    
    case $increment_type in
        "major")
            major=$((major + 1))
            minor=0
            patch=0
            ;;
        "minor")
            minor=$((minor + 1))
            patch=0
            ;;
        "patch")
            patch=$((patch + 1))
            ;;
        *)
            echo -e "${RED}✗${NC} Invalid increment type: $increment_type"
            exit 1
            ;;
    esac
    
    echo "$major.$minor.$patch"
}

# Main script logic
case "${1:-}" in
    "patch"|"minor"|"major")
        current_version=$(get_current_version)
        new_version=$(increment_version "$current_version" "$1")
        
        echo -e "${BLUE}Current version:${NC} $current_version"
        echo -e "${BLUE}New version:${NC} $new_version"
        echo ""
        
        # Update manifest.json
        update_manifest_version "$new_version"
        
        # Commit changes
        git add manifest.json
        git commit -m "Bump version to $new_version"
        echo -e "${GREEN}✓${NC} Committed version bump"
        
        # Create tag
        create_tag "$new_version"
        
        echo ""
        echo -e "${YELLOW}Next steps:${NC}"
        echo "1. Push changes: git push origin main"
        echo "2. Push tags: git push origin --tags"
        echo "3. Create GitHub release for v$new_version"
        ;;
        
    "set")
        if [ -z "${2:-}" ]; then
            echo -e "${RED}✗${NC} Please provide a version number"
            echo "Example: $0 set 1.2.3"
            exit 1
        fi
        
        new_version=$2
        
        # Validate version format
        if ! [[ $new_version =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            echo -e "${RED}✗${NC} Invalid version format. Use semantic versioning (e.g., 1.2.3)"
            exit 1
        fi
        
        current_version=$(get_current_version)
        
        echo -e "${BLUE}Current version:${NC} $current_version"
        echo -e "${BLUE}New version:${NC} $new_version"
        echo ""
        
        # Update manifest.json
        update_manifest_version "$new_version"
        
        # Commit changes
        git add manifest.json
        git commit -m "Set version to $new_version"
        echo -e "${GREEN}✓${NC} Committed version change"
        
        # Create tag
        create_tag "$new_version"
        
        echo ""
        echo -e "${YELLOW}Next steps:${NC}"
        echo "1. Push changes: git push origin main"
        echo "2. Push tags: git push origin --tags"
        echo "3. Create GitHub release for v$new_version"
        ;;
        
    "show")
        current_version=$(get_current_version)
        echo -e "${BLUE}Current version:${NC} $current_version"
        
        # Show recent tags
        echo -e "${BLUE}Recent tags:${NC}"
        git tag -l | sort -V | tail -5
        ;;
        
    *)
        usage
        exit 1
        ;;
esac
