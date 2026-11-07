export class DomainError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.name = 'DomainError';
        this.code = code;
    }
}
