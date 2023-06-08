import { encrypt, decrypt } from 'crypto-js/aes'
import { parse } from 'crypto-js/enc-utf8'
import nopadding from 'crypto-js/pad-nopadding'
import pkcs7 from 'crypto-js/pad-pkcs7'
import ECB from 'crypto-js/mode-ecb'
import CFB from 'crypto-js/mode-cfb'
import md5 from 'crypto-js/md5'
import UTF8 from 'crypto-js/enc-utf8'
import Base64 from 'crypto-js/enc-base64'

export interface EncryptionParams {
  key: string
  iv: string
}

export class AesEncryption {
  private key
  private iv

  constructor(opt: Partial<EncryptionParams> = {}) {
    const { key, iv } = opt
    if (key) {
      this.key = parse(key)
    }
    if (iv) {
      this.iv = parse(iv)
    }
  }

  get getOptions() {
    return {
      mode: ECB,
      padding: pkcs7,
      iv: this.iv,
    }
  }

  encryptByAES(cipherText: string) {
    return encrypt(cipherText, this.key, this.getOptions).toString()
  }

  decryptByAES(cipherText: string) {
    return decrypt(cipherText, this.key, this.getOptions).toString(UTF8)
  }
}

export function encryptByBase64(cipherText: string) {
  return UTF8.parse(cipherText).toString(Base64)
}

export function decodeByBase64(cipherText: string) {
  return Base64.parse(cipherText).toString(UTF8)
}

export function encryptByMd5(password: string) {
  return md5(password).toString()
}

export function encryptByAES(cipherText: string, key: string) {
  const opt = {
    mode: CFB,
    padding: nopadding,
    iv: parse(key),
  }
  return encrypt(cipherText, parse(key), opt).toString()
}

export function decryptByAES(cipherText: string, key: string) {
  const opt = {
    mode: CFB,
    padding: nopadding,
    iv: parse(key),
  }
  return decrypt(cipherText, parse(key), opt).toString(UTF8)
}
