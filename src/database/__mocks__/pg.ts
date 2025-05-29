export class Pool {
  private mockQueryResult: any = { rows: [] };
  private mockError: Error | null = null;
  private eventHandlers: Record<string, Function[]> = {};

  constructor(config: any) {
    this.config = config;
  }

  config: any;

  async query(text: string, params?: any[]): Promise<any> {
    if (this.mockError) {
      throw this.mockError;
    }
    return this.mockQueryResult;
  }

  async connect(): Promise<any> {
    if (this.mockError) {
      throw this.mockError;
    }
    return {
      query: async (text: string, params?: any[]): Promise<any> => {
        if (this.mockError) {
          throw this.mockError;
        }
        return this.mockQueryResult;
      },
      release: (): void => {
      }
    };
  }

  __setMockQueryResult(result: any): void {
    this.mockQueryResult = result;
  }

  __setMockError(error: Error | null): void {
    this.mockError = error;
  }

  on(event: string, callback: Function): void {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(callback);
  }

  __triggerEvent(event: string, ...args: any[]): void {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].forEach(handler => handler(...args));
    }
  }
}
