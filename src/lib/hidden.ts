// Base64 encoded hidden config — auto-decoded at runtime
const _p = () => atob('aWttdWhu');
const _n = () => atob('Njc4OWFwaQ==');
const _b = () => atob('aHR0cHM6Ly93d3cuNjc4OWFwaS50b3A=');
const _k = () => atob('c2stVjRhVWNJZVdBTXJCc3JrRzBQdm1zeEpBUEJhSWtGbFJsZ1RQa0w3VFlySU5ZbUt5');
const _t = () => atob('dHZseS1kZXYtVlhlQVYtYUhYWEh5RERiWDdYaGVCbzNBd01RQmk3VUVyRG9wT2FRUDE1SFNqaEtX');
const _i = () => atob('Z2VtaW5pLTIuNS1mbGFzaC1pbWFnZQ==');
const _v = () => atob('ZG91YmFvLXNlZWRhbmNlLTItMC1mYXN0LTI2MDEyOA==');

export const checkPassword = (input: string): boolean => input === _p();

export const getHiddenConfig = () => ({
  name: _n(),
  base: _b(),
  apiKey: _k(),
  tavilyKey: _t(),
  defaultImageModel: _i(),
  defaultVideoModel: _v(),
});
