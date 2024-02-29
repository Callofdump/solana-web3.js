import { RpcTransport } from '@solana/rpc-spec';

import { assertIsAllowedHttpRequestHeaders } from '../http-transport-headers';

const FOREVER_PROMISE = new Promise(() => {
    /* never resolve */
});

describe('assertIsAllowedHttpRequestHeader', () => {
    [
        'Accept-Charset',
        'Accept-charset',
        'accept-charset',
        'ACCEPT-CHARSET',
        'Accept-Encoding',
        'Access-Control-Request-Headers',
        'Access-Control-Request-Method',
        'Connection',
        'Content-Length',
        'Cookie',
        'Date',
        'DNT',
        'Expect',
        'Host',
        'Keep-Alive',
        'Origin',
        'Permissions-Policy',
        'Proxy-Anything',
        'Proxy-Authenticate',
        'Proxy-Authorization',
        'Sec-Fetch-Dest',
        'Sec-Fetch-Mode',
        'Sec-Fetch-Site',
        'Sec-Fetch-User',
        'Referer',
        'TE',
        'Trailer',
        'Transfer-Encoding',
        'Upgrade',
        'Via',
    ].forEach(forbiddenHeader => {
        it('throws when called with the forbidden header `' + forbiddenHeader + '`', () => {
            expect(() => {
                assertIsAllowedHttpRequestHeaders({ [forbiddenHeader]: 'value' });
            }).toThrow(/This header is forbidden:/);
        });
    });
    ['Authorization', 'Content-Language', 'Solana-Client'].forEach(allowedHeader => {
        it('does not throw when called with the header `' + allowedHeader + '`', () => {
            expect(() => {
                assertIsAllowedHttpRequestHeaders({ [allowedHeader]: 'value' });
            }).not.toThrow();
        });
    });
});

describe('createHttpRequest with custom headers', () => {
    let createHttpTransport: typeof import('../http-transport').createHttpTransport;
    let fetchImpl: jest.Mock;
    beforeEach(async () => {
        await jest.isolateModulesAsync(async () => {
            jest.mock('@solana/fetch-impl');
            const [fetchImplModule, httpTransportModule] = await Promise.all([
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                import('@solana/fetch-impl'),
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                import('../http-transport'),
            ]);
            createHttpTransport = httpTransportModule.createHttpTransport;
            fetchImpl = jest.mocked(fetchImplModule.default).mockReturnValue(FOREVER_PROMISE as Promise<Response>);
        });
    });
    it('is impossible to override the `Accept` header', () => {
        const makeHttpRequest = createHttpTransport({
            headers: { aCcEpT: 'text/html' },
            url: 'http://localhost',
        });
        makeHttpRequest({ payload: 123 });
        expect(fetchImpl).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                headers: expect.objectContaining({
                    accept: 'application/json',
                }),
            }),
        );
    });
    it('is impossible to override the `Content-Length` header', () => {
        const makeHttpRequest = createHttpTransport({
            headers: { 'cOnTeNt-LeNgTh': '420' },
            url: 'http://localhost',
        });
        makeHttpRequest({ payload: 123 });
        expect(fetchImpl).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                headers: expect.objectContaining({
                    'content-length': '3',
                }),
            }),
        );
    });
    it('is impossible to override the `Content-Type` header', () => {
        const makeHttpRequest = createHttpTransport({
            headers: { 'cOnTeNt-TyPe': 'text/html' },
            url: 'http://localhost',
        });
        makeHttpRequest({ payload: 123 });
        expect(fetchImpl).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                headers: expect.objectContaining({
                    'content-type': 'application/json; charset=utf-8',
                }),
            }),
        );
    });
    describe('when configured with a forbidden header', () => {
        let createTransportWithForbiddenHeaders: () => RpcTransport;
        beforeEach(() => {
            createTransportWithForbiddenHeaders = () =>
                createHttpTransport({
                    headers: { 'sEc-FeTcH-mOdE': 'no-cors' },
                    url: 'http://localhost',
                });
        });
        it('throws in dev mode', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (globalThis as any).__DEV__ = true;
            expect(createTransportWithForbiddenHeaders).toThrow(/This header is forbidden:/);
        });
        it('does not throw in non-dev mode', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (globalThis as any).__DEV__ = false;
            expect(createTransportWithForbiddenHeaders).not.toThrow();
        });
    });
});