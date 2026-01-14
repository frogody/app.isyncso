


export function createPageUrl(pageName: string) {
    // Only lowercase the path portion, not query parameters
    const [path, query] = pageName.split('?');
    const lowercasePath = '/' + path.toLowerCase().replace(/ /g, '-');
    return query ? `${lowercasePath}?${query}` : lowercasePath;
}