export class AdapterListener {
	public name: string;
	public callback: (...args: any[]) => any;
	public registered = false;
	public register: any;
	public unregister: any;

	private _listeners: any[] = [];

	/**
	 * Creates a new AdapterListener instance with the provided configuration.
	 *
	 * @param {Object} config - The configuration object for the listener.
	 * @param {string} config.name - The name of the event listener.
	 * @param {Function} config.callback - The callback function to be called when the event is triggered.
	 * @param {Function} config.unregister - The function to unregister the event listeners.
	 * @param {Function} config.register - The function to register the event listeners.
	 */
	constructor({
		name,
		callback,
		unregister,
		register,
	}: {
		name: string;
		callback: (...args: any[]) => any;
		unregister: (...callbacks: any[]) => void;
		register: (callback: (...args: any[]) => any) => any[];
	}) {
		this.name = name;

		// Function to register the event listeners
		this.register = () => {
			if (!this.registered) {
				this.registered = true;
				this._listeners = register(callback);
			}
		};

		// Function to unregister the event listeners
		this.unregister = () => {
			if (this.register) {
				this.registered = false;
				unregister(this._listeners);
			}
		};

		this.callback = callback;
	}
}
