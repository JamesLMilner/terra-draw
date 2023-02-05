

export class AdapterListener {

    public name: string;
    public callback: (...args: any[]) => any;
    public registered: boolean = false
    public register: any;
    public unregister: any;

    private listeners: any[] = []

    constructor({ name, callback, unregister, register }: {
        name: string,
        callback: (...args: any[]) => any,
        unregister: (...callbacks: any[]) => void,
        register: (callback: (...args: any[]) => any) => any[]
    }) {

        this.name = name;

        this.register = () => {
            if (!this.registered) {
                this.registered = true;
                this.listeners = register(callback)
            }
        }

        this.unregister = () => {
            if (this.register) {
                this.registered = false;
                unregister(this.listeners)
            }
        }

        this.callback = callback;

    }

}