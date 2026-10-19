import { Injectable } from '@nestjs/common';

@Injectable()
export class ClientService {
    search(firstName?: string, lastName?: string) {
        const first = firstName?.trim() ?? '';
        const last = lastName?.trim() ?? '';
        if (!firstName && !lastName) {
            return [];
        }

        return [
            {
                clientNumber: 1,
                firstName: first,
                lastName: last,
            }
        ];
    }
}
