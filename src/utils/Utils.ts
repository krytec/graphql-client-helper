import { URL } from 'url';
/**
 * * Function to validate a given url as string
 * @param value
 */
export function isValidURL(value: string): boolean {
    try {
        const url = new URL(value);
        return true;
    } catch (TypeError) {
        return false;
    }
}
